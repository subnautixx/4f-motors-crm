"use client";

import { ArrowRightLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fetchContactNotes } from "@/lib/data/queries";
import { STATUS_DOT, STATUS_LABEL } from "@/lib/domain/lead";
import { formatDateTime } from "@/lib/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ContactNote, StatusHistoryEntry, TransferEntry } from "@/lib/types/views";
import { cn } from "@/lib/utils";

type Entry =
  | { kind: "note"; id: string; at: string; note: ContactNote }
  | { kind: "status"; id: string; at: string; entry: StatusHistoryEntry }
  | { kind: "transfer"; id: string; at: string; entry: TransferEntry };

/**
 * Tudo o que aconteceu com o cliente, numa coluna só: notas, mudanças de
 * etapa e trocas de responsável, do mais recente para o mais antigo.
 *
 * Antes eram duas caixas separadas, e a pergunta "o que mudou depois daquela
 * ligação?" exigia cruzar as datas de uma com as da outra. E a caixa do
 * histórico cortava o nome de quem mudou ("Breno Al…"): aqui o texto quebra
 * linha em vez de sumir.
 */
export function ContactTimeline({
  contactId,
  currentUserId,
  initialNotes,
  history,
  transfers,
}: {
  contactId: string;
  currentUserId: string;
  initialNotes: ContactNote[];
  history: StatusHistoryEntry[];
  transfers: TransferEntry[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entries = useMemo<Entry[]>(
    () =>
      [
        ...notes.map((note): Entry => ({ kind: "note", id: `n-${note.id}`, at: note.created_at, note })),
        ...history.map((entry): Entry => ({ kind: "status", id: `s-${entry.id}`, at: entry.created_at, entry })),
        ...transfers.map((entry): Entry => ({ kind: "transfer", id: `t-${entry.id}`, at: entry.created_at, entry })),
      ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)),
    [notes, history, transfers],
  );

  async function submit() {
    const text = body.trim();
    if (!text || pending) return;

    setPending(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: insertError } = await supabase
      .from("notes")
      .insert({ contact_id: contactId, author_user_id: currentUserId, body: text });

    if (insertError) {
      setError("Não foi possível salvar a nota.");
    } else {
      setBody("");
      setNotes(await fetchContactNotes(supabase, contactId));
    }

    setPending(false);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="O que aconteceu neste atendimento?"
          rows={3}
          maxLength={2000}
          aria-label="Nova nota"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => void submit()} disabled={pending || !body.trim()}>
            {pending ? "Salvando…" : "Adicionar nota"}
          </Button>
          {error ? <span className="text-xs text-destructive">{error}</span> : null}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma nota ou movimentação ainda.</p>
      ) : (
        // Linha vertical à esquerda; cada acontecimento tem seu marcador nela.
        <ol className="relative space-y-4 border-l border-border pl-5">
          {entries.map((item) => (
            <li key={item.id} className="relative">
              <TimelineEntry item={item} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Marker({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute -left-[25px] top-1.5 h-2 w-2 rounded-full ring-4 ring-surface",
        className,
      )}
    />
  );
}

function TimelineEntry({ item }: { item: Entry }) {
  if (item.kind === "note") {
    const { note } = item;
    return (
      <>
        <Marker className="bg-foreground/60" />
        <div className="rounded-md bg-surface-muted px-3 py-2.5 text-sm">
          <p className="whitespace-pre-wrap break-words text-foreground/90">{note.body}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {note.author?.full_name ?? "—"} · {formatDateTime(note.created_at)}
          </p>
        </div>
      </>
    );
  }

  if (item.kind === "status") {
    const { entry } = item;
    return (
      <>
        <Marker className={STATUS_DOT[entry.to_status]} />
        <p className="text-sm text-foreground/90">
          {entry.from_status ? (
            <>
              <span className="text-muted-foreground">{STATUS_LABEL[entry.from_status]} → </span>
              <span className="font-medium">{STATUS_LABEL[entry.to_status]}</span>
            </>
          ) : (
            <>
              Entrou como <span className="font-medium">{STATUS_LABEL[entry.to_status]}</span>
            </>
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {/* Sem autor é o próprio sistema: o funil anda sozinho quando o
              cliente responde ou recebe a primeira mensagem. */}
          {entry.changed_by?.full_name ?? "Automático"} · {formatDateTime(entry.created_at)}
        </p>
      </>
    );
  }

  const { entry } = item;
  return (
    <>
      <Marker className="bg-muted-foreground/50" />
      <p className="text-sm text-foreground/90">
        <ArrowRightLeft
          aria-hidden
          className="mr-1.5 inline h-3.5 w-3.5 align-[-2px] text-muted-foreground"
        />
        Transferido de <span className="font-medium">{entry.from_user?.full_name ?? "—"}</span> para{" "}
        <span className="font-medium">{entry.to_user?.full_name ?? "—"}</span>
      </p>
      {entry.reason ? (
        <p className="mt-0.5 break-words text-sm text-muted-foreground">{entry.reason}</p>
      ) : null}
      <p className="mt-0.5 text-xs text-muted-foreground">
        {entry.changed_by ? `${entry.changed_by.full_name} · ` : ""}
        {formatDateTime(entry.created_at)}
      </p>
    </>
  );
}
