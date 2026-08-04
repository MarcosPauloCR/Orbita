"use server";

import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const GRID_SIZE = 16;
const SHIP_COUNT = 3;

type Side = "a" | "b";
type Status = "setup" | "playing" | "won_a" | "won_b";

type Row = {
  id: string;
  player_a: string;
  player_b: string;
  ships_a: string | null;
  ships_b: string | null;
  shots_a: string;
  shots_b: string;
  turn: Side;
  status: Status;
};

const COLUMNS = "id, player_a, player_b, ships_a, ships_b, shots_a, shots_b, turn, status";

function parseCsv(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(",")
    .filter((v) => v.length > 0)
    .map((v) => Number(v));
}

export type BattleshipCell = { ship?: boolean; fired: boolean; hit: boolean };

export type BattleshipGame = {
  id: string;
  status: Status;
  mySide: Side;
  turn: Side;
  myShipsPlaced: boolean;
  opponentShipsPlaced: boolean;
  myBoard: BattleshipCell[];
  opponentBoard: BattleshipCell[];
};

function toGame(row: Row, userId: string): BattleshipGame {
  const mySide: Side = row.player_a === userId ? "a" : "b";
  const myShips = parseCsv(mySide === "a" ? row.ships_a : row.ships_b);
  const opponentShips = parseCsv(mySide === "a" ? row.ships_b : row.ships_a);
  const shotsOnMe = parseCsv(mySide === "a" ? row.shots_b : row.shots_a);
  const myShots = parseCsv(mySide === "a" ? row.shots_a : row.shots_b);

  const myBoard: BattleshipCell[] = Array.from({ length: GRID_SIZE }, (_, i) => ({
    ship: myShips.includes(i),
    fired: shotsOnMe.includes(i),
    hit: shotsOnMe.includes(i) && myShips.includes(i),
  }));

  const opponentBoard: BattleshipCell[] = Array.from({ length: GRID_SIZE }, (_, i) => ({
    fired: myShots.includes(i),
    hit: myShots.includes(i) && opponentShips.includes(i),
  }));

  return {
    id: row.id,
    status: row.status,
    mySide,
    turn: row.turn,
    myShipsPlaced: myShips.length === SHIP_COUNT,
    opponentShipsPlaced: opponentShips.length === SHIP_COUNT,
    myBoard,
    opponentBoard,
  };
}

export async function getGame(): Promise<BattleshipGame | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("battleship_games")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return null;
  return toGame(row as Row, session.userId);
}

export async function startGame(): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );
  if (!otherUser) return fail("Não achei o outro usuário.");

  const supabase = createAdminClient();
  const { data: active } = await supabase
    .from("battleship_games")
    .select("id")
    .in("status", ["setup", "playing"])
    .maybeSingle();

  if (active) return fail("Já tem um jogo em andamento.");

  const { error } = await supabase.from("battleship_games").insert({
    player_a: session.userId,
    player_b: otherUser.id,
  });

  if (error) return fail(`Falha ao criar jogo: ${error.message}`);
  return ok(null);
}

export async function placeShips(cells: number[]): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const unique = Array.from(new Set(cells)).filter(
    (c) => Number.isInteger(c) && c >= 0 && c < GRID_SIZE
  );
  if (unique.length !== SHIP_COUNT) {
    return fail(`Escolha exatamente ${SHIP_COUNT} posições.`);
  }

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("battleship_games")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) return fail("Nenhum jogo em andamento.");
  if (row.status !== "setup") return fail("Os navios já foram posicionados.");

  const mySide: Side = row.player_a === session.userId ? "a" : "b";
  const field = mySide === "a" ? "ships_a" : "ships_b";
  if (mySide === "a" ? row.ships_a : row.ships_b) {
    return fail("Você já posicionou seus navios.");
  }

  const otherShips = mySide === "a" ? row.ships_b : row.ships_a;
  const newStatus: Status = otherShips ? "playing" : "setup";

  const { error: updateError } = await supabase
    .from("battleship_games")
    .update({ [field]: unique.join(","), status: newStatus })
    .eq("id", row.id);

  if (updateError) return fail(`Falha ao posicionar navios: ${updateError.message}`);
  return ok(null);
}

export async function fireShot(cell: number): Promise<ActionResult<BattleshipGame>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");
  if (!Number.isInteger(cell) || cell < 0 || cell >= GRID_SIZE) {
    return fail("Célula inválida.");
  }

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("battleship_games")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) return fail("Nenhum jogo em andamento.");
  if (row.status !== "playing") return fail("Esse jogo não está em andamento.");

  const mySide: Side = row.player_a === session.userId ? "a" : "b";
  if (mySide !== row.turn) return fail("Não é sua vez.");

  const myShotsField = mySide === "a" ? "shots_a" : "shots_b";
  const myShots = parseCsv(mySide === "a" ? row.shots_a : row.shots_b);
  if (myShots.includes(cell)) return fail("Você já atirou aí.");

  myShots.push(cell);
  const opponentShips = parseCsv(mySide === "a" ? row.ships_b : row.ships_a);
  const won = opponentShips.length > 0 && opponentShips.every((c) => myShots.includes(c));

  const nextTurn: Side = mySide === "a" ? "b" : "a";
  const newStatus: Status = won ? (mySide === "a" ? "won_a" : "won_b") : "playing";

  const { error: updateError } = await supabase
    .from("battleship_games")
    .update({
      [myShotsField]: myShots.join(","),
      turn: won ? row.turn : nextTurn,
      status: newStatus,
    })
    .eq("id", row.id);

  if (updateError) return fail(`Falha ao atirar: ${updateError.message}`);

  return ok(
    toGame(
      {
        ...row,
        [myShotsField]: myShots.join(","),
        turn: won ? row.turn : nextTurn,
        status: newStatus,
      },
      session.userId
    )
  );
}
