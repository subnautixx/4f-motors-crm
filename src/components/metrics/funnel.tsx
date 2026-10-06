import type { FunnelStep } from "@/lib/data/metrics";
import { cn } from "@/lib/utils";

/**
 * O funil do período: de quantos abordados se chegou a quantos consignados.
 *
 * Substitui a fileira de seis cartões iguais, em que "Consignados" — o
 * resultado — tinha o mesmo tamanho de "Mensagens recebidas". Aqui o resultado
 * abre a leitura em número grande, e as barras mostram onde o funil afina.
 *
 * Barra cinza para as etapas e verde só para a última: é a etapa que importa,
 * e o verde é o mesmo do status "Consignado" no resto do sistema. Sem âmbar —
 * nada aqui é urgente.
 */
export function Funnel({ steps, periodLabel }: { steps: FunnelStep[]; periodLabel: string }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  const approached = steps[0]?.value ?? 0;
  const consigned = steps[steps.length - 1]?.value ?? 0;

  return (
    <div className="grid gap-5 rounded-lg border border-border bg-surface p-4 sm:p-5 lg:grid-cols-[200px_minmax(0,760px)] lg:gap-10">
      <div className="flex flex-col justify-center">
        <p className="text-xs text-muted-foreground">Consignados</p>
        {/* Número grande isolado: algarismo proporcional, não tabular. */}
        <p className="mt-1.5 text-5xl font-semibold leading-none tracking-tight [font-variant-numeric:normal]">
          {consigned}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {periodLabel} · {approached} {approached === 1 ? "abordado" : "abordados"}
        </p>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_48px] gap-3 text-[11px] text-muted-foreground sm:grid-cols-[112px_1fr_88px]">
          <span>Etapa</span>
          <span className="hidden sm:block" />
          <span className="text-right">
            <span className="sm:hidden">Taxa</span>
            <span className="hidden sm:inline">Da anterior</span>
          </span>
        </div>

        <ol className="space-y-2.5 sm:space-y-1.5">
          {steps.map((step) => {
            const last = step.key === "consigned";
            return (
              // No celular o rótulo vai para cima da barra: lado a lado, ele
              // comia a largura e as barras viravam tracinhos iguais.
              <li
                key={step.key}
                className="grid grid-cols-[1fr_48px] items-center gap-x-3 gap-y-1 sm:grid-cols-[112px_1fr_88px]"
              >
                <span className="col-span-2 text-[13px] text-foreground/85 sm:col-span-1">
                  {step.label}
                </span>

                <span className="flex min-w-0 items-center gap-2">
                  {step.value > 0 ? (
                    <span
                      aria-hidden
                      // Base reta, ponta arredondada; 20px de espessura, abaixo
                      // do teto de 24px para a barra não virar bloco.
                      className={cn(
                        "h-5 shrink-0 rounded-r-[4px]",
                        last ? "bg-emerald-400/80" : "bg-zinc-500/70",
                      )}
                      // O valor fica na ponta da barra; os 3rem reservam o lugar dele.
                      style={{ width: `calc((100% - 3rem) * ${step.value / max})`, minWidth: 3 }}
                    />
                  ) : null}
                  <span className={cn("text-sm", last ? "font-semibold" : "font-medium")}>
                    {step.value}
                  </span>
                </span>

                <span className="text-right text-xs text-muted-foreground">
                  {step.rate === null ? "" : `${step.rate}%`}
                </span>
              </li>
            );
          })}
        </ol>

        <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
          Responderam são os abordados que responderam depois da abordagem. As outras etapas
          contam quem entrou nelas no período, então a taxa entre elas pode passar de 100%.
        </p>
      </div>
    </div>
  );
}
