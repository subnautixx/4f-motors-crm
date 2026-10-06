import { CalendarClock, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactTimeline } from "@/components/crm/contact-timeline";
import { EditContactDialog } from "@/components/crm/edit-contact-dialog";
import { PlateChip } from "@/components/crm/plate-chip";
import { StatusTrack } from "@/components/crm/status-track";
import { TransferDialog } from "@/components/crm/transfer-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/misc";
import { requireProfile } from "@/lib/auth/session";
import {
  fetchActiveUsers,
  fetchContactNotes,
  fetchStatusHistory,
  fetchTransfers,
} from "@/lib/data/queries";
import { formatAgenda, formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn, formatCurrencyBRL, formatKm } from "@/lib/utils";

export const metadata: Metadata = { title: "Cliente" };
export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  // Sem contato visível pela RLS = 404. Não existe "acesso negado" que revele
  // a existência de um cliente de outro consignador.
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!contact) notFound();

  const isAdmin = profile.role === "admin";

  // As conversas do cliente servem duas vezes: a mais recente vira o botão
  // "Abrir conversa", e todas juntas dão as transferências da linha do tempo.
  const conversationsPromise = supabase
    .from("conversations")
    .select("id")
    .eq("contact_id", id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(10)
    .then(({ data }) => data ?? []);

  const [{ data: vehicles }, { data: owner }, conversations, users, notes, history, transfers] =
    await Promise.all([
      supabase
        .from("vehicles")
        .select("*")
        .eq("contact_id", id)
        .order("is_primary", { ascending: false }),
      supabase.from("profiles").select("id, full_name").eq("id", contact.owner_user_id).maybeSingle(),
      conversationsPromise,
      isAdmin ? fetchActiveUsers(supabase) : Promise.resolve([]),
      fetchContactNotes(supabase, id),
      fetchStatusHistory(supabase, id),
      conversationsPromise.then((list) => fetchTransfers(supabase, list.map((c) => c.id))),
    ]);

  const vehicle = vehicles?.[0] ?? null;
  const conversationId = conversations[0]?.id ?? null;
  const listingUrl = vehicle?.listing_url ?? contact.listing_url;
  const platform = vehicle?.source_platform ?? contact.source_platform;

  // Componente de servidor: renderiza uma vez só, então ler o relógio aqui não
  // diverge de nada no navegador.
  const now = Date.now();
  const overdue =
    contact.next_action_at !== null && new Date(contact.next_action_at).getTime() <= now;

  const yearText = vehicle?.year
    ? `${vehicle.year}${vehicle.model_year ? `/${vehicle.model_year}` : ""}`
    : null;
  const specs = [yearText, vehicle?.km != null ? formatKm(vehicle.km) : null, vehicle?.color]
    .filter(Boolean)
    .join(" · ");
  const title = [vehicle?.model, vehicle?.version].filter(Boolean).join(" ");

  return (
    <>
      <PageHeader
        title={contact.full_name}
        description={formatPhone(contact.phone_e164)}
        action={
          <div className="flex items-center gap-2">
            <EditContactDialog contactId={id} />
            {conversationId ? (
              <Button asChild size="sm">
                <Link href={`/inbox?c=${conversationId}`}>Abrir conversa</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-4 p-4 sm:space-y-6 sm:p-6">
          {/* O que fazer vem antes de tudo. Âmbar só quando já passou da hora. */}
          {contact.next_action_at ? (
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg px-4 py-3 ring-1 ring-inset",
                overdue ? "bg-amber-500/[0.08] ring-amber-500/25" : "bg-surface ring-border",
              )}
            >
              <CalendarClock
                aria-hidden
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  overdue ? "text-amber-400" : "text-muted-foreground",
                )}
              />
              <div className="min-w-0 text-sm">
                <p className={cn("font-medium", overdue ? "text-amber-200" : "text-foreground")}>
                  {overdue ? "Próxima ação vencida" : "Próxima ação"} ·{" "}
                  {formatAgenda(contact.next_action_at, now)}
                </p>
                {contact.next_action_note ? (
                  <p className="mt-0.5 break-words text-muted-foreground">
                    {contact.next_action_note}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* O negócio em si: o carro e em que pé está a consignação. */}
          <section aria-label="Veículo e etapa" className="rounded-lg border border-border bg-surface">
            <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 p-4 sm:p-5">
              <div className="min-w-0 space-y-1">
                {vehicle ? (
                  <>
                    {vehicle.brand ? (
                      <p className="text-xs text-muted-foreground">{vehicle.brand}</p>
                    ) : null}
                    <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.01em]">
                      {title || "Sem modelo informado"}
                    </h2>
                    {specs ? <p className="text-sm text-muted-foreground">{specs}</p> : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado.</p>
                )}
              </div>

              {vehicle?.listed_price != null ? (
                <div className="sm:text-right">
                  <p className="text-xs text-muted-foreground">Preço anunciado</p>
                  <p className="font-display text-2xl font-bold leading-tight tracking-[-0.01em]">
                    {formatCurrencyBRL(vehicle.listed_price)}
                  </p>
                </div>
              ) : null}

              {vehicle?.plate || platform || listingUrl ? (
                <div className="flex basis-full flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  {vehicle?.plate ? <PlateChip plate={vehicle.plate} /> : null}
                  {platform ? <span className="text-muted-foreground">{platform}</span> : null}
                  {listingUrl ? (
                    <a
                      href={listingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-foreground underline decoration-muted-foreground/50 underline-offset-2 transition-colors hover:decoration-foreground"
                    >
                      Abrir anúncio original
                      <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="border-t border-border p-4 sm:px-5">
              <StatusTrack contactId={id} value={contact.status} />
            </div>
          </section>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            <section className="space-y-4 rounded-lg border border-border bg-surface p-4 lg:col-span-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Linha do tempo
              </h2>
              <ContactTimeline
                contactId={id}
                currentUserId={profile.id}
                initialNotes={notes}
                history={history}
                transfers={transfers}
              />
            </section>

            <section className="space-y-4 self-start rounded-lg border border-border bg-surface p-4">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Situação
              </h2>

              <Field label="Responsável">
                <div className="flex items-center justify-between gap-2">
                  <span>{owner?.full_name ?? "—"}</span>
                  {isAdmin ? (
                    <TransferDialog
                      contactId={id}
                      currentUserId={contact.owner_user_id}
                      users={users}
                    />
                  ) : null}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                <Field label="Cadastrado em">{formatDate(contact.created_at)}</Field>
                <Field label="Última interação">{formatDate(contact.last_interaction_at)}</Field>
              </div>
              {/* Consentimento: a Meta exige para modelo de Marketing, e a
                  resposta do próprio cliente é a evidência mais confiável. */}
              <Field label="Consentimento">
                {contact.opt_in_at ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    {formatDate(contact.opt_in_at)}
                    {contact.opt_in_source === "resposta_do_cliente" ? " · respondeu" : ""}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                    Ainda não respondeu
                  </span>
                )}
              </Field>

              {contact.notes ? <Field label="Observações">{contact.notes}</Field> : null}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
