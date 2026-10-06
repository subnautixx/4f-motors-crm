import type * as React from "react";
import { describeServiceWindow, windowFractionLeft } from "@/lib/domain/service-window";
import { cn } from "@/lib/utils";

const STROKE = 2;
/** Respiro entre a foto e o anel, para o anel não parecer borda do avatar. */
const GAP = 2;

/**
 * Janela de 24h desenhada em volta do avatar.
 *
 * O anel esvazia conforme a janela passa: cheio quando o cliente acabou de
 * escrever, vazio quando fecha — e aí some. Nas últimas horas fica âmbar, a
 * cor que no sistema inteiro quer dizer "precisa de você agora". Dá para ler a
 * lista inteira de relance sem abrir conversa nenhuma.
 *
 * O espaço do anel é reservado sempre, com ou sem anel: assim ele pode chegar
 * depois de montar (o "agora" só existe no navegador) sem empurrar a linha.
 */
export function WindowRing({
  expiresAt,
  now,
  size,
  className,
  children,
}: {
  expiresAt: string | null;
  /** `null` até montar — sem relógio, não desenha nada. */
  now: number | null;
  /** Diâmetro do avatar, em px. */
  size: number;
  className?: string;
  children: React.ReactNode;
}) {
  const box = size + (GAP + STROKE) * 2;
  const radius = (box - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  const janela = now === null ? null : describeServiceWindow(expiresAt, new Date(now));
  const open = janela !== null && (janela.state === "aberta" || janela.state === "acabando");
  const ending = janela?.state === "acabando";
  const description = open
    ? (janela.label ?? `Faltam ${Math.floor((janela.minutesLeft ?? 0) / 60)}h da janela de 24 horas`)
    : undefined;

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: box, height: box }}
      title={description}
    >
      {children}

      {open ? (
        <>
          <svg
            aria-hidden
            width={box}
            height={box}
            viewBox={`0 0 ${box} ${box}`}
            // Começa no topo e esvazia no sentido do relógio.
            className="pointer-events-none absolute inset-0 -rotate-90"
          >
            <circle
              cx={box / 2}
              cy={box / 2}
              r={radius}
              fill="none"
              strokeWidth={STROKE}
              className="stroke-border/70"
            />
            <circle
              cx={box / 2}
              cy={box / 2}
              r={radius}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - windowFractionLeft(janela))}
              // Só anima quando muda: a mensagem do cliente reabre a janela e o
              // anel enche de volta — é a confirmação de que algo chegou.
              className={cn(
                "transition-[stroke-dashoffset,stroke] duration-200 ease-out",
                ending ? "stroke-amber-400" : "stroke-foreground/35",
              )}
            />
          </svg>
          <span className="sr-only">{description}</span>
        </>
      ) : null}
    </span>
  );
}
