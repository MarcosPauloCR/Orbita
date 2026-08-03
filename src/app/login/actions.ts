"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/auth/users";
import {
  GATE_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL,
  signSessionToken,
} from "@/lib/auth/session";

export type LoginState = { error: string | null };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const user = await verifyCredentials(username, password);
  if (!user) {
    return { error: "Usuário ou senha incorretos." };
  }

  const token = await signSessionToken({
    userId: user.id,
    userName: user.name,
  });

  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
  cookieStore.delete(GATE_COOKIE);

  redirect("/app");
}
