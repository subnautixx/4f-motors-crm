import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Funnel } from "@/components/metrics/funnel";
import { PeriodTabs } from "@/components/metrics/period-tabs";
import { TeamRanking } from "@/components/metrics/team-ranking";
import { VolumeChart } from "@/components/metrics/volume-chart";
import { requireProfile } from "@/lib/auth/session";
import {
  bucketOf,
  fetchTeamMetrics,
  fetchUserMetrics,
  fetchVolume,
  fillVolumeBuckets,
  funnelSteps,
  resolvePeriod,
} from "@/lib/data/metrics";
import { formatTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Desempenho" };
export const dynamic = "force-dynamic";

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
}) {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();
  const period = resolvePeriod(await searchParams);
  const isAdmin = profile.role === "admin";

  const [mine, team, volume] = await Promise.all([
    fetchUserMetrics(supabase, profile.id, profile.full_name, period),
    isAdmin ? fetchTeamMetrics(supabase, period) : Promise.resolve([]),
    // Admin vê o volume da operação inteira; consignador, o próprio.
    fetchVolume(supabase, isAdmin ? null : profile.id, period),
  ]);

  const buckets = fillVolumeBuckets(volume, period);
  const granularity = bucketOf(period);

  return (
    <>
      <PageHeader
        title="Desempenho"
        description={isAdmin ? "Sua atividade e a da equipe" : "Sua atividade"}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
          <PeriodTabs period={period} />

          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isAdmin ? "Sua atividade" : period.label}
            </h2>

            <Funnel steps={funnelSteps(mine)} periodLabel={period.label} />

            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>
                Mensagens enviadas: <span className="text-foreground">{mine.messages_sent}</span>
              </span>
              <span>
                Recebidas: <span className="text-foreground">{mine.messages_received}</span>
              </span>
              <span>
                Primeira atividade:{" "}
                <span className="text-foreground">
                  {mine.first_activity_at ? formatTime(mine.first_activity_at) : "—"}
                </span>
              </span>
              <span>
                Última atividade:{" "}
                <span className="text-foreground">
                  {mine.last_activity_at ? formatTime(mine.last_activity_at) : "—"}
                </span>
              </span>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isAdmin ? "Volume da operação" : "Seu volume"} ·{" "}
              {granularity === "hour" ? "por horário" : "por dia"}
            </h2>
            <VolumeChart buckets={buckets} granularity={granularity} />
          </section>

          {isAdmin ? (
            <section className="space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Equipe · {period.label}
              </h2>
              <TeamRanking rows={team} />
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
