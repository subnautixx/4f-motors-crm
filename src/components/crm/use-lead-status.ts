"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { LeadStatus } from "@/lib/types/database";

/**
 * Troca o status do lead. A escrita vai direto pelo cliente do Supabase — a
 * RLS já garante que só o responsável (ou o admin) consegue alterar, e o
 * trigger grava o histórico.
 *
 * Otimista: a tela muda na hora e volta atrás se o banco recusar.
 */
export function useLeadStatus(contactId: string, initial: LeadStatus, onChanged?: () => void) {
  const [status, setStatus] = useState<LeadStatus>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function change(next: LeadStatus) {
    if (next === status || saving) return;

    const previous = status;
    setStatus(next);
    setSaving(true);
    setError(false);

    const { error: updateError } = await createSupabaseBrowserClient()
      .from("contacts")
      .update({ status: next })
      .eq("id", contactId);

    if (updateError) {
      setStatus(previous);
      setError(true);
    } else {
      onChanged?.();
    }

    setSaving(false);
  }

  return { status, saving, error, change };
}
