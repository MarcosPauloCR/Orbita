export type Difficulty = "easy" | "medium" | "hard";

// Sem acentos de propósito — facilita casar letra a letra na grade.
export const WORDSEARCH_THEMES: Record<string, string[]> = {
  Espaço: [
    "LUA", "ESTRELA", "ORBITA", "COMETA", "GALAXIA", "PLANETA",
    "ECLIPSE", "METEORO", "UNIVERSO", "NEBULOSA", "SATURNO", "ASTRO",
  ],
  Amor: [
    "BEIJO", "ABRACO", "CARINHO", "SAUDADE", "PAIXAO", "ROMANCE",
    "CASAL", "AMOR", "CORACAO", "TERNURA", "AFETO", "CUMPLICIDADE",
  ],
  Comida: [
    "PIZZA", "CHOCOLATE", "SORVETE", "HAMBURGUER", "MACARRAO", "FEIJAO",
    "ARROZ", "SALADA", "BOLO", "CAFE", "SUCO", "PASTEL",
  ],
  Animais: [
    "GATO", "CACHORRO", "LEAO", "TIGRE", "ELEFANTE", "GIRAFA",
    "MACACO", "COELHO", "PASSARO", "PEIXE", "TARTARUGA", "PANDA",
  ],
  Filmes: [
    "TITANIC", "MATRIX", "AVATAR", "SHREK", "FROZEN", "COCO",
    "MOANA", "JOKER", "GREASE", "ROCKY",
  ],
};

type Dir = { dx: number; dy: number };

const DIRECTIONS: Record<Difficulty, Dir[]> = {
  easy: [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
  ],
  medium: [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 },
  ],
  hard: [
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
    { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    { dx: 1, dy: 1 }, { dx: -1, dy: -1 },
    { dx: 1, dy: -1 }, { dx: -1, dy: 1 },
  ],
};

const GRID_SIZE: Record<Difficulty, number> = { easy: 9, medium: 11, hard: 13 };
const WORD_COUNT: Record<Difficulty, number> = { easy: 6, medium: 8, hard: 10 };

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generatePuzzle(
  pool: string[],
  difficulty: Difficulty
): { size: number; grid: string; words: string[] } {
  const size = GRID_SIZE[difficulty];
  const wordCount = WORD_COUNT[difficulty];
  const dirs = DIRECTIONS[difficulty];

  const candidates = shuffle(
    pool.map((w) => w.toUpperCase().replace(/[^A-Z]/g, ""))
  ).filter((w) => w.length >= 3 && w.length <= size);

  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const placed: string[] = [];

  for (const word of candidates) {
    if (placed.length >= wordCount) break;

    for (let attempt = 0; attempt < 200; attempt++) {
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const startX = Math.floor(Math.random() * size);
      const startY = Math.floor(Math.random() * size);
      const endX = startX + dir.dx * (word.length - 1);
      const endY = startY + dir.dy * (word.length - 1);
      if (endX < 0 || endX >= size || endY < 0 || endY >= size) continue;

      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const x = startX + dir.dx * i;
        const y = startY + dir.dy * i;
        const existing = grid[y][x];
        if (existing && existing !== word[i]) {
          fits = false;
          break;
        }
      }
      if (!fits) continue;

      for (let i = 0; i < word.length; i++) {
        const x = startX + dir.dx * i;
        const y = startY + dir.dy * i;
        grid[y][x] = word[i];
      }
      placed.push(word);
      break;
    }
  }

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!grid[y][x]) {
        grid[y][x] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
    }
  }

  return {
    size,
    grid: grid.map((row) => row.join("")).join(""),
    words: placed,
  };
}
