"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { GATE_COOKIE, GATE_TTL, signGateToken } from "@/lib/auth/session";

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function getClientIp(): string {
  const headerList = headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export async function checkGate(formData: FormData) {
  const query = String(formData.get("q") ?? "").trim();
  const ip = getClientIp();

  const { allowed } = checkRateLimit(ip);

  const secretCode = process.env.SECRET_GATE_CODE ?? "";
  const isMatch =
    allowed && query.length > 0 && timingSafeCompare(query, secretCode);

  if (!isMatch) {
    const imageSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
      "fotos da lua"
    )}`;
    redirect(imageSearchUrl);
  }

  const token = await signGateToken();
  cookies().set(GATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_TTL,
  });

  redirect("/login");
}
