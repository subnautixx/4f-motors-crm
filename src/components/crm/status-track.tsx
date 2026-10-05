"use client";

import { useRouter } from "next/navigation";
import { FUNNEL_ORDER, STATUS_CLASS, STATUS_DOT, STATUS_LABEL, TERMINAL_STATUSES } from "@/lib/domain/lead";
import type { LeadStatus } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { useLeadStatus } from "./use-lead-status";

/**
 * O funil como trilho, na ficha do cliente.
 *
 * Uma lista suspensa escondia a pergunta que a ficha precisa responder de
 * relance: em que pé está este cliente e quanto falta. Aqui as seis etapas
 * ficam à vista, as já percorridas preenchidas na cor da etapa atual, e um
 * clique numa etapa move o cliente para ela.
 *
 * Perdido e Sem resposta ficam fora do trilho, porque não são um passo a
 * mais — são a saída dele. Voltar ao funil é clicar numa etapa.
 */
export function StatusTrack({ contactId, value }: { contactId: string; value: LeadStatus }) {
  const router = useRouter();
  // O histórico da linha do tempo vem do servidor; recarregar traz a mudança.
  const { status, saving, error, change } = useLeadStatus(contactId, value, () => router.refresh());

  const index = FUNNEL_ORDER.indexOf(status);
  const outside = index === -1;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm">
          <span className="font-medium text-foreground">{STATUS_LABEL[status]}</span>
          <span className="text-muted-foreground">
            {outside ? " · fora do funil" : ` · etapa ${index + 1} de ${FUNNEL_ORDER.length}`}
          </span>
        </p>

        <div className="flex items-center gap-1.5">
          {TERMINAL_STATUSES.map((s) => {
            const current = s === status;
            return (
              <button
                key={s}
                type="button"
                onClick={() => void change(s)}
                disabled={saving}
                aria-pressed={current}
                className={cn(
                  "focus-ring h-7 rounded-full px-2.5 text-xs ring-1 ring-inset transition-colors disabled:cursor-wait",
                  current
                    ? cn("font-medium", STATUS_CLASS[s])
                    : "text-muted-foreground ring-border hover:text-foreground",
                )}
              >
                {STATUS_LABEL[s]}
              </button>
            );
          })}
        </div>
      </div>

      <ol className="grid grid-cols-6 gap-1" aria-label="Etapas do funil">
        {FUNNEL_ORDER.map((s, i) => {
          const reached = !outside && i <= index;
          const current = i === index;

          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => void change(s)}
                disabled={saving}
                aria-pressed={current}
                aria-label={current ? `${STATUS_LABEL[s]}, etapa atual` : `Mover para ${STATUS_LABEL[s]}`}
                // No celular o rótulo some e o alvo de toque continua com 32px.
                className="focus-ring group flex min-h-8 w-full flex-col justify-center gap-1.5 rounded-md text-left disabled:cursor-wait sm:min-h-0 sm:py-1"
              >
                <span
                  className={cn(
                    "h-1.5 w-full rounded-full transition-colors duration-200",
                    reached ? STATUS_DOT[status] : "bg-border group-hover:bg-muted-foreground/40",
                  )}
                />
                <span
                  className={cn(
                    "hidden truncate text-[11px] leading-4 sm:block",
                    current
                      ? "font-medium text-foreground"
                      : reached
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60 group-hover:text-muted-foreground",
                  )}
                >
                  {STATUS_LABEL[s]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          Não foi possível salvar. Tente de novo.
        </p>
      ) : null}
    </div>
  );
}
