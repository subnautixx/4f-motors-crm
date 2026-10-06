import type { Metadata } from "next";
import { InboxShell } from "@/components/inbox/inbox-shell";
import { requireProfile } from "@/lib/auth/session";
import {
  CONVERSATION_LIST_LIMIT,
  fetchActiveUsers,
  fetchConversations,
  fetchFirstStepsState,
} from "@/lib/data/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inbox" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A inbox reflete o estado agora; nada aqui pode vir de cache.
export const dynamic = "force-dynamic";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c: conversationParam } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  // A RLS já recorta: consignador recebe só as conversas dele.
  const [recent, users] = await Promise.all([
    fetchConversations(supabase),
    fetchActiveUsers(supabase),
  ]);

  // A lista para nas mais recentes. Um link para uma conversa antiga — o
  // "Abrir conversa" da ficha — busca essa conversa à parte; sem isso a inbox
  // não a achava e abria a conversa de outro cliente no lugar.
  const linked =
    conversationParam &&
    UUID.test(conversationParam) &&
    !recent.some((c) => c.id === conversationParam)
      ? await fetchConversations(supabase, { ids: [conversationParam] }, 1)
      : [];
  const conversations = [...recent, ...linked];

  // Só interessa quando não há conversa nenhuma — é aí que a inbox precisa
  // dizer o que fazer em vez de pedir para selecionar algo que não existe.
  const firstSteps = conversations.length === 0 ? await fetchFirstStepsState(supabase) : null;

  return (
    <InboxShell
      conversations={conversations}
      users={users}
      isAdmin={profile.role === "admin"}
      currentUserId={profile.id}
      initialConversationId={conversationParam ?? null}
      listTruncated={recent.length >= CONVERSATION_LIST_LIMIT}
      firstSteps={firstSteps}
    />
  );
}
