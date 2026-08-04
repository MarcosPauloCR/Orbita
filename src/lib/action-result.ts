// Server Actions no Next.js, em produção, ocultam a mensagem de qualquer
// erro lançado com `throw` (troca por um texto genérico + digest, mesmo
// pra erros de validação que a gente lançou de propósito). Por isso as
// actions que precisam mostrar uma mensagem específica pro usuário devem
// RETORNAR o erro nesse formato em vez de lançar.
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T>(error: string): ActionResult<T> {
  return { ok: false, error };
}
