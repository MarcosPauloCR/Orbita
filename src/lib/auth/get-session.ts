import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from "./session";

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
