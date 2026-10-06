import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/types/database";

export type SessionProfile = Pick<
  ProfileRow,
  "id" | "full_name" | "email" | "role" | "is_active" | "onboarding_completed_at"
>;

type SessionState =
  | { kind: "anonimo" }
  | { kind: "inativo" }
  | { kind: "ativo"; profile: SessionProfile };

async function loadSession(): Promise<SessionState> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { kind: "anonimo" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) return { kind: "inativo" };

  return { kind: "ativo", profile };
}

/** Perfil do usuário logado, ou null. Não redireciona. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const session = await loadSession();
  return session.kind === "ativo" ? session.profile : null;
}

/**
 * Para uso em páginas: garante sessão ativa ou manda para o login.
 *
 * Usuário desativado ainda tem login válido no Auth. Mandá-lo para `/login`
 * criava um laço: o middleware vê a sessão e devolve para a inbox, que
 * devolve para o login. Por isso ele passa por `/auth/sair`, que encerra a
 * sessão (página não pode apagar cookie; rota pode) e explica o motivo.
 */
export async function requireProfile(): Promise<SessionProfile> {
  const session = await loadSession();
  if (session.kind === "anonimo") redirect("/login");
  if (session.kind === "inativo") redirect("/auth/sair?motivo=desativado");
  return session.profile;
}

/** Para uso em páginas restritas ao administrador. */
export async function requireAdmin(): Promise<SessionProfile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/inbox");
  return profile;
}

export function isAdmin(profile: SessionProfile | null): boolean {
  return profile?.role === "admin";
}
