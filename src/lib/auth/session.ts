import { SignJWT, jwtVerify } from "jose";

export const GATE_COOKIE = "sv_gate";
export const SESSION_COOKIE = "sv_session";

const GATE_TTL_SECONDS = 10 * 60; // 10 minutos pra completar o login
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 dias

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Variável de ambiente ausente: SESSION_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export async function signGateToken(): Promise<string> {
  return new SignJWT({ purpose: "gate" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${GATE_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyGateToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload.purpose === "gate";
  } catch {
    return false;
  }
}

export type SessionPayload = {
  userId: string;
  userName: string;
};

export async function signSessionToken(
  session: SessionPayload
): Promise<string> {
  return new SignJWT({ purpose: "session", ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.purpose !== "session") return null;
    if (typeof payload.userId !== "string" || typeof payload.userName !== "string") {
      return null;
    }
    return { userId: payload.userId, userName: payload.userName };
  } catch {
    return null;
  }
}

export const GATE_TTL = GATE_TTL_SECONDS;
export const SESSION_TTL = SESSION_TTL_SECONDS;
