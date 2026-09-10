import Link from "next/link";

export function NextDateCard({ day }: { day: string | null }) {
  if (!day) return null;

  const target = new Date(`${day}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  const weekday = target.toLocaleDateString("pt-BR", { weekday: "long" });

  let text: string;
  if (diffDays === 0) text = "hoje é o dia do nosso encontro! 🎉";
  else if (diffDays === 1) text = `amanhã é o encontro (${weekday})`;
  else text = `faltam ${diffDays} dias pro nosso encontro de ${weekday}`;

  return (
    <Link href="/app/agenda" className="card flex items-center gap-3">
      <span className="text-lg">📅</span>
      <span className="text-xs text-ink">{text}</span>
    </Link>
  );
}
