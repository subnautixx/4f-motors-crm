"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_STATUSES, STATUS_LABEL } from "@/lib/domain/lead";
import type { LeadStatus } from "@/lib/types/database";
import { useLeadStatus } from "./use-lead-status";

/** Status do lead em lista suspensa — a forma compacta, para a ficha lateral da inbox. */
export function StatusSelect({
  contactId,
  value,
  onChanged,
  className,
}: {
  contactId: string;
  value: LeadStatus;
  onChanged?: () => void;
  className?: string;
}) {
  const { status, saving, error, change } = useLeadStatus(contactId, value, onChanged);

  return (
    <div className={className}>
      <Select value={status} onValueChange={(next) => void change(next as LeadStatus)} disabled={saving}>
        <SelectTrigger aria-label="Status do cliente">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALL_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="mt-1 text-xs text-destructive">Não foi possível salvar.</p> : null}
    </div>
  );
}
