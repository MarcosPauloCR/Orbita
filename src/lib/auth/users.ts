import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";

export type AppUser = {
  id: string;
  name: string;
};

type UserRow = AppUser & { password_hash: string };

export async function getPublicUsers(): Promise<AppUser[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("users").select("id, name");
  // Lida sem exceção de propósito: isso roda em Server Components (layout,
  // várias páginas) em toda navegação — um erro aqui não pode derrubar a
  // tela inteira com uma página em branco, então degrada pra lista vazia.
  if (error) {
    console.error("getPublicUsers falhou:", error.message);
    return [];
  }
  return data ?? [];
}

export async function verifyCredentials(
  login: string,
  password: string
): Promise<AppUser | null> {
  const normalized = login.trim().toLowerCase();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, name, password_hash");
  if (error) throw error;

  const user = (data as UserRow[] | null)?.find(
    (u) =>
      u.id.toLowerCase() === normalized || u.name.toLowerCase() === normalized
  );
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  return { id: user.id, name: user.name };
}

export async function verifyPasswordById(
  userId: string,
  password: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("password_hash")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;

  return bcrypt.compare(password, data.password_hash);
}

export async function updatePassword(
  userId: string,
  newPasswordHash: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ password_hash: newPasswordHash })
    .eq("id", userId);
  if (error) throw error;
}
