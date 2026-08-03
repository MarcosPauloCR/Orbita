import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

function loadEnvLocal() {
  const path = fileURLToPath(new URL("../.env.local", import.meta.url));
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Variável de ambiente ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

const [id, password, name] = process.argv.slice(2);
if (!id || !password) {
  console.error('Uso: npm run set-user -- <id> <senha> ["Nome de exibição"]');
  process.exit(1);
}

loadEnvLocal();

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY")
);

const password_hash = bcrypt.hashSync(password, 12);

const { error } = await supabase
  .from("users")
  .upsert({ id, name: name ?? id, password_hash }, { onConflict: "id" });

if (error) {
  console.error("Falha ao salvar usuário:", error.message);
  process.exit(1);
}

console.log(`Usuário "${id}" salvo com sucesso.`);
