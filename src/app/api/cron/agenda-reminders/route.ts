import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicUsers } from "@/lib/auth/users";
import { sendPushToUser } from "@/lib/push";
import { brazilDateKey, BRAZIL_OFFSET_HOURS } from "@/lib/daily-questions";

export const dynamic = "force-dynamic";

// Avisa com essa antecedência do horário marcado (day + meeting_time, que
// são gravados em horário local de Brasília, sem fuso na coluna).
const REMINDER_LEAD_MS = 2 * 60 * 60 * 1000;

function brazilWallClockToUtcMs(day: string, time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  const [y, mo, d] = day.split("-").map(Number);
  return Date.UTC(y, mo - 1, d, h, m) + BRAZIL_OFFSET_HOURS * 3600000;
}

// Aceita tanto o header que o Vercel Cron manda sozinho (Authorization:
// Bearer CRON_SECRET) quanto ?secret= na URL, pra também dar pra usar um
// pinger externo (ex: cron-job.org) caso o plano do Vercel não rode cron
// com granularidade de minutos.
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const nowMs = Date.now();
  const todayKey = brazilDateKey();
  const tomorrowKey = brazilDateKey(new Date(nowMs + 86400000));

  const { data, error } = await supabase
    .from("agenda_items")
    .select("id, day, meeting_time")
    .is("reminded_at", null)
    .not("meeting_time", "is", null)
    .in("day", [todayKey, tomorrowKey]);

  if (error || !data || data.length === 0) {
    return Response.json({ sent: 0 });
  }

  const due = data.filter((row) => {
    const meetingMs = brazilWallClockToUtcMs(row.day, row.meeting_time!);
    return meetingMs > nowMs && meetingMs - nowMs <= REMINDER_LEAD_MS;
  });

  if (due.length === 0) {
    return Response.json({ sent: 0 });
  }

  const users = await getPublicUsers();

  await Promise.all(
    due.map(async (row) => {
      await Promise.all(
        users.map((u) => sendPushToUser(u.id, { title: "Órbita", body: "1 novo item" }))
      );
      await supabase
        .from("agenda_items")
        .update({ reminded_at: new Date().toISOString() })
        .eq("id", row.id);
    })
  );

  return Response.json({ sent: due.length });
}
