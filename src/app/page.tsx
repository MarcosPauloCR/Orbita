import { checkGate } from "./actions";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-lg">
        <h1 className="mb-8 text-center text-3xl font-normal text-gray-700">
          Buscar
        </h1>
        <form action={checkGate} className="flex w-full items-center gap-2">
          <input
            type="text"
            name="q"
            autoFocus
            autoComplete="off"
            placeholder="Digite sua busca"
            className="w-full rounded-full border border-gray-300 px-5 py-3 text-base text-gray-800 shadow-sm outline-none focus:border-gray-400 focus:shadow-md"
          />
          <button
            type="submit"
            className="rounded-full bg-gray-100 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-200"
          >
            Buscar
          </button>
        </form>
      </div>
    </main>
  );
}
