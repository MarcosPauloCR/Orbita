"use server";

import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth/get-session";
import { updatePassword, verifyPasswordById } from "@/lib/auth/users";

export type ChangePasswordState = { error: string | null; success: boolean };

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await getSession();
  if (!session) {
    return { error: "Sessão expirada.", success: false };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 6) {
    return {
      error: "A nova senha precisa ter pelo menos 6 caracteres.",
      success: false,
    };
  }
  if (newPassword !== confirmPassword) {
    return { error: "As senhas novas não coincidem.", success: false };
  }

  const valid = await verifyPasswordById(session.userId, currentPassword);
  if (!valid) {
    return { error: "Senha atual incorreta.", success: false };
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await updatePassword(session.userId, newHash);

  return { error: null, success: true };
}
