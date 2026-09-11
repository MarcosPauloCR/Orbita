"use client";

import { useEffect, useState } from "react";

// Resolvido em runtime porque componentes como NeonBorder e Phosphor não
// entendem "var(--x)" — só sabem ler hex/rgb prontos. As variáveis já
// mudam sozinhas entre claro/escuro no globals.css; aqui só refletimos o
// valor atual de cada uma.
export function useThemeVars<T extends readonly string[]>(names: T): Record<T[number], string> {
  const initial = Object.fromEntries(names.map((n) => [n, ""])) as Record<T[number], string>;
  const [values, setValues] = useState(initial);
  const key = names.join(",");

  useEffect(() => {
    function resolve() {
      const styles = getComputedStyle(document.documentElement);
      setValues(
        Object.fromEntries(
          names.map((n) => [n, styles.getPropertyValue(n).trim()])
        ) as Record<T[number], string>
      );
    }
    resolve();

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", resolve);
    return () => query.removeEventListener("change", resolve);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return values;
}
