"use client";

import { useEffect, useState } from "react";

/**
 * Relógio que só existe depois de montar.
 *
 * Tudo que depende de "agora" — janela de 24h, prazo vencido, "há 3 min" —
 * daria um resultado no HTML do servidor e outro no navegador, e o React
 * acusaria divergência de hidratação. Até montar, devolve `initial`: `null`
 * esconde o dado, e um instante vindo do servidor (o mesmo nos dois renders)
 * mostra o dado já no primeiro HTML.
 *
 * Avança a cada minuto, que é a menor unidade que a interface mostra.
 */
export function useNow(initial: number | null = null, intervalMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(initial);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
