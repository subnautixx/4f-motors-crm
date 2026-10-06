import type { VolumeBucket } from "@/lib/data/metrics";
import { cn } from "@/lib/utils";

/**
 * Volume de mensagens por hora ou por dia.
 *
 * Barras empilhadas em CSS puro, sem biblioteca de gráfico: a pergunta que
 * isto responde é "em que horário a equipe trabalha e onde estão os buracos",
 * e para isso a altura relativa basta. Eixo, grade e tooltip só adicionariam
 * ruído numa ferramenta de operação.
 *
 * Dois cinzas, não âmbar e azul: o que a equipe enviou em claro, o que chegou
 * em escuro. Âmbar fica para o que precisa de alguém agora, e nada num gráfico
 * de ontem precisa.
 */
export function VolumeChart({
  buckets,
  granularity,
}: {
  buckets: VolumeBucket[];
  granularity: "hour" | "day";
}) {
  const max = Math.max(1, ...buckets.map((b) => b.sent + b.received));
  const totalSent = buckets.reduce((sum, b) => sum + b.sent, 0);
  const totalReceived = buckets.reduce((sum, b) => sum + b.received, 0);

  if (totalSent + totalReceived === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
        Nenhuma mensagem registrada no período.
      </div>
    );
  }

  // Em 30 dias, rotular todos os dias vira uma parede ilegível.
  const labelEvery = granularity === "hour" ? 3 : buckets.length > 14 ? 5 : 1;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-zinc-300" />
          <span className="text-muted-foreground">Enviadas</span>
          <span className="font-medium">{totalSent}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-zinc-600" />
          <span className="text-muted-foreground">Recebidas</span>
          <span className="font-medium">{totalReceived}</span>
        </span>
        <span className="ml-auto text-muted-foreground">
          Pico: {max} {max === 1 ? "mensagem" : "mensagens"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div
          className="flex h-36 min-w-full items-stretch gap-[3px]"
          role="img"
          aria-label={`Volume de mensagens por ${granularity === "hour" ? "hora" : "dia"}: ${totalSent} enviadas e ${totalReceived} recebidas.`}
        >
          {buckets.map((bucket) => {
            const total = bucket.sent + bucket.received;
            const heightPercent = (total / max) * 100;

            return (
              <div
                key={bucket.key}
                // h-full é essencial: sem altura resolvida no pai, a altura
                // percentual da barra vira zero e o gráfico sai vazio.
                className="group flex h-full min-w-[10px] flex-1 flex-col items-center justify-end"
                title={`${bucket.label} · ${bucket.sent} enviadas, ${bucket.received} recebidas`}
              >
                {/* Até 24px de largura, ponta arredondada e base reta; o vão de
                    2px separa enviadas de recebidas sem traçar borda. */}
                <div
                  className="flex w-full max-w-6 flex-col justify-end gap-[2px] overflow-hidden rounded-t-[4px] transition-[filter] duration-150 group-hover:brightness-125"
                  style={{ height: `${Math.max(heightPercent, total > 0 ? 2 : 0)}%` }}
                >
                  {bucket.received > 0 ? (
                    <div
                      className="min-h-[2px] w-full bg-zinc-600"
                      style={{ flexGrow: bucket.received }}
                      aria-hidden
                    />
                  ) : null}
                  {bucket.sent > 0 ? (
                    <div
                      className="min-h-[2px] w-full bg-zinc-300"
                      style={{ flexGrow: bucket.sent }}
                      aria-hidden
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex min-w-full gap-[3px]">
          {buckets.map((bucket, index) => (
            <span
              key={bucket.key}
              className={cn(
                "min-w-[10px] flex-1 text-center text-[10px] text-muted-foreground",
                index % labelEvery === 0 ? "" : "invisible",
              )}
            >
              {bucket.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
