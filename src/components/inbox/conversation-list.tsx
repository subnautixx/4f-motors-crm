"use client";

import { Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ContactAvatar } from "@/components/crm/contact-avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchConversationsBeyondList } from "@/lib/data/queries";
import { ALL_STATUSES, STATUS_DOT, STATUS_LABEL } from "@/lib/domain/lead";
import { describeServiceWindow } from "@/lib/domain/service-window";
import { formatListTime } from "@/lib/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { LeadStatus } from "@/lib/types/database";
import type { ConversationListItem, UserRef } from "@/lib/types/views";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { WindowRing } from "./window-ring";

/**
 * Filtro ligado. Neutro de propósito: âmbar no sistema quer dizer "precisa de
 * você agora", e um filtro escolhido não precisa de nada.
 */
const FILTER_ON = "bg-foreground/[0.08] font-medium text-foreground ring-foreground/25";
const FILTER_OFF = "bg-transparent text-muted-foreground ring-border";

/** Minúsculas e sem acento: "joao" acha "João", "acai" acha "Açaí". */
function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Abaixo disto a busca no banco devolveria meia lista de clientes. */
const MIN_REMOTE_TERM = 3;

interface Props {
  conversations: ConversationListItem[];
  /** A lista bateu no limite: a busca também procura no banco. */
  listTruncated?: boolean;
  selectedId: string | null;
  /** O item vai junto quando a conversa veio da busca e não está na lista. */
  onSelect: (id: string, item?: ConversationListItem) => void;
  users: UserRef[];
  isAdmin: boolean;
}

export function ConversationList({
  conversations,
  listTruncated = false,
  selectedId,
  onSelect,
  users,
  isAdmin,
}: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "todos">("todos");
  const [assignee, setAssignee] = useState<string>("todos");
  const [unreadOnly, setUnreadOnly] = useState(false);
  // Um relógio para a lista inteira: as janelas de todas as linhas andam juntas.
  const now = useNow();

  const passesFilters = useCallback(
    (c: ConversationListItem) => {
      if (unreadOnly && c.unread_count === 0) return false;
      if (status !== "todos" && c.contact.status !== status) return false;
      if (assignee !== "todos" && c.assigned_user_id !== assignee) return false;
      return true;
    },
    [unreadOnly, status, assignee],
  );

  // Filtro no cliente: a RLS já entregou só o que este usuário pode ver, e a
  // lista cabe em memória. Resultado instantâneo, sem ida ao servidor.
  const filtered = useMemo(() => {
    const term = fold(search.trim());
    const digits = term.replace(/\D/g, "");

    return conversations.filter((c) => {
      if (!passesFilters(c)) return false;
      if (!term) return true;

      const vehicle = [c.vehicle?.brand, c.vehicle?.model, c.vehicle?.version]
        .filter(Boolean)
        .join(" ");

      return (
        fold(c.contact.full_name).includes(term) ||
        (digits.length > 0 && c.contact.phone_e164.includes(digits)) ||
        fold(vehicle).includes(term) ||
        fold(c.last_message_preview ?? "").includes(term)
      );
    });
  }, [conversations, search, passesFilters]);

  /**
   * A lista para nas 200 mais recentes. Passou disso, a busca também pergunta
   * ao banco — senão o cliente que falou há meses "não existia" na inbox.
   */
  const [older, setOlder] = useState<ConversationListItem[]>([]);
  const [olderState, setOlderState] = useState<"idle" | "loading" | "error">("idle");
  const remoteTerm = listTruncated && search.trim().length >= MIN_REMOTE_TERM ? search.trim() : "";

  useEffect(() => {
    if (!remoteTerm) {
      setOlder([]);
      setOlderState("idle");
      return;
    }

    let cancelled = false;
    setOlderState("loading");
    // Espera a pessoa parar de digitar: uma ida ao banco por busca, não por tecla.
    const timer = setTimeout(() => {
      searchConversationsBeyondList(createSupabaseBrowserClient(), remoteTerm)
        .then((found) => {
          if (cancelled) return;
          setOlder(found);
          setOlderState("idle");
        })
        .catch(() => {
          if (!cancelled) setOlderState("error");
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [remoteTerm]);

  const olderVisible = useMemo(
    () => older.filter((c) => !conversations.some((l) => l.id === c.id) && passesFilters(c)),
    [older, conversations, passesFilters],
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const hasFilters = status !== "todos" || assignee !== "todos" || unreadOnly;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="space-y-2.5 border-b border-border px-3 pb-2.5 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nome, telefone ou veículo"
            className="h-9 rounded-lg border-transparent bg-surface-muted pl-8 pr-8 text-[13px]"
            aria-label="Buscar conversas"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Limpar busca</span>
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={unreadOnly} onClick={() => setUnreadOnly((v) => !v)}>
            Não lidas
            {totalUnread > 0 ? (
              <span className={cn("ml-1 tabular-nums", unreadOnly ? "" : "text-primary")}>
                {totalUnread}
              </span>
            ) : null}
          </FilterChip>

          <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus | "todos")}>
            <SelectTrigger
              className={cn(
                "h-7 w-auto gap-1 rounded-full border-0 px-2.5 text-xs ring-1 ring-inset",
                status !== "todos" ? FILTER_ON : FILTER_OFF,
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin ? (
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger
                className={cn(
                  "h-7 w-auto gap-1 rounded-full border-0 px-2.5 text-xs ring-1 ring-inset",
                  assignee !== "todos" ? FILTER_ON : FILTER_OFF,
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Toda a equipe</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setStatus("todos");
                setAssignee("todos");
                setUnreadOnly(false);
              }}
              className="ml-auto text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Limpar
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 && olderVisible.length === 0 && olderState !== "loading" ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            {conversations.length === 0
              ? "Nenhuma conversa ainda."
              : olderState === "error"
                ? "Não foi possível procurar nas conversas mais antigas. Tente de novo."
                : search.trim() && !hasFilters
                  ? `Nenhuma conversa com “${search.trim()}”.`
                  : "Nenhuma conversa com esses filtros."}
          </p>
        ) : (
          <>
            {filtered.length > 0 ? (
              <ul className="py-1">
                {filtered.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conversation={c}
                    selected={c.id === selectedId}
                    showAssignee={isAdmin}
                    onSelect={onSelect}
                    now={now}
                  />
                ))}
              </ul>
            ) : null}

            {remoteTerm && (olderState !== "idle" || olderVisible.length > 0) ? (
              <p
                role="status"
                className="px-4 pb-1 pt-3 text-[11px] font-medium text-muted-foreground"
              >
                {olderState === "loading"
                  ? "Procurando nas conversas mais antigas…"
                  : olderState === "error"
                    ? "Não foi possível procurar nas conversas mais antigas."
                    : "Conversas mais antigas"}
              </p>
            ) : null}

            {olderVisible.length > 0 ? (
              <ul className="pb-1">
                {olderVisible.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conversation={c}
                    selected={c.id === selectedId}
                    showAssignee={isAdmin}
                    onSelect={(id) => onSelect(id, c)}
                    now={now}
                  />
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center rounded-full px-2.5 text-xs ring-1 ring-inset transition-colors",
        active ? FILTER_ON : cn(FILTER_OFF, "hover:text-foreground"),
      )}
    >
      {children}
    </button>
  );
}

function ConversationRow({
  conversation: c,
  selected,
  showAssignee,
  onSelect,
  now,
}: {
  conversation: ConversationListItem;
  selected: boolean;
  showAssignee: boolean;
  onSelect: (id: string) => void;
  now: number | null;
}) {
  const vehicle = [c.vehicle?.brand, c.vehicle?.model].filter(Boolean).join(" ");
  const unread = c.unread_count > 0;
  // Quem está para perder a janela precisa ser visto sem abrir a conversa.
  // Só depois de montar: calculada no servidor, a janela daria um texto no
  // HTML e outro no navegador.
  const janela = now === null ? null : describeServiceWindow(c.service_window_expires_at, new Date(now));

  return (
    <li className="px-2">
      <button
        type="button"
        onClick={() => onSelect(c.id)}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "relative flex w-full gap-2.5 rounded-lg px-2 py-2.5 text-left transition-colors",
          selected ? "bg-secondary" : "hover:bg-surface-muted",
        )}
      >
        {/* Marcador de seleção: mais legível que só a mudança de fundo. */}
        {selected ? (
          <span className="motion-fade absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-foreground/80" />
        ) : null}

        {/* Margem negativa: o anel ocupa o respiro da linha, não empurra o texto. */}
        <WindowRing
          // Quem pediu SAIR não recebe nada: anel âmbar ali chamaria para uma
          // resposta que o sistema vai recusar.
          expiresAt={c.contact.opt_out_at ? null : c.service_window_expires_at}
          now={now}
          size={36}
          className="-mx-1 -mb-1 -mt-0.5"
        >
          <ContactAvatar
            contactId={c.contact.id}
            name={c.contact.full_name}
            photoPath={c.contact.photo_path}
            highlighted={unread}
          />
        </WindowRing>

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[13px] leading-5",
                unread ? "font-semibold text-foreground" : "font-medium text-foreground/90",
              )}
            >
              {c.contact.full_name}
            </span>
            <span
              className={cn(
                "shrink-0 text-[11px] tabular-nums",
                unread ? "font-medium text-primary" : "text-muted-foreground",
              )}
            >
              {formatListTime(c.last_message_at)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-xs leading-5",
                unread ? "text-foreground/75" : "text-muted-foreground",
              )}
            >
              {c.last_message_preview ?? "Sem mensagens"}
            </span>
            {unread ? (
              <span className="motion-pop flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground">
                {c.unread_count > 99 ? "99+" : c.unread_count}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
            <span
              className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[c.contact.status])}
              title={STATUS_LABEL[c.contact.status]}
            />
            <span className="shrink-0">{STATUS_LABEL[c.contact.status]}</span>

            {c.contact.opt_out_at ? (
              <span
                className="shrink-0 rounded-full bg-surface-muted px-1.5 text-[10px] font-medium text-muted-foreground ring-1 ring-inset ring-border"
                title="O cliente respondeu SAIR — o envio está bloqueado"
              >
                pediu SAIR
              </span>
            ) : janela?.state === "acabando" ? (
              <span
                className="shrink-0 rounded-full bg-amber-500/15 px-1.5 text-[10px] font-medium text-amber-300 ring-1 ring-inset ring-amber-500/25"
                title="A janela de 24 horas está acabando"
              >
                {janela.minutesLeft !== null && janela.minutesLeft < 60
                  ? `${janela.minutesLeft}min`
                  : `${Math.floor((janela.minutesLeft ?? 0) / 60)}h`}
              </span>
            ) : janela?.state === "fechada" ? (
              <span
                className="shrink-0 rounded-full bg-surface-muted px-1.5 text-[10px] font-medium text-muted-foreground/80 ring-1 ring-inset ring-border"
                title="A janela de 24 horas fechou — só com modelo aprovado"
              >
                fechada
              </span>
            ) : null}

            {vehicle ? (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="truncate">{vehicle}</span>
              </>
            ) : null}
            {showAssignee && c.assignee ? (
              <span className="ml-auto shrink-0 truncate pl-1 text-muted-foreground/70">
                {c.assignee.full_name.split(" ")[0]}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
}
