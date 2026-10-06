import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./accounts", () => ({
  userCanSendFromAccount: async () => true,
  getAccountWithSecrets: async () => ({ account: { id: "acc-1" }, credentials: {} }),
}));

import { authorizeConversationSend } from "./send-guard";

/** Cliente de sessão falso: devolve sempre a mesma conversa. */
function sessaoCom(conversa: Record<string, unknown>) {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: conversa, error: null }),
  };
  return { from: () => query } as never;
}

const ator = { id: "user-1", role: "consignador" } as never;

function conversa(contato: Record<string, unknown>) {
  return {
    id: "conv-1",
    contact_id: "contact-1",
    whatsapp_account_id: "acc-1",
    assigned_user_id: "user-1",
    // Janela aberta: o único motivo de recusa possível é o SAIR.
    service_window_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    contacts: { phone_e164: "+5511900000000", status: "respondeu", ...contato },
  };
}

/**
 * A política publicada promete: respondeu SAIR, a loja para de enviar. Antes
 * nada tratava o pedido — o envio seguia normal.
 */
describe("authorizeConversationSend — SAIR", () => {
  it("recusa o envio para quem respondeu SAIR e diz por quê", async () => {
    const result = await authorizeConversationSend(
      sessaoCom(conversa({ opt_out_at: "2026-10-05T15:00:00Z" })),
      ator,
      "conv-1",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(422);
    const body = await result.response.json();
    expect(body.error).toBe("contact_opted_out");
    expect(body.message).toContain("05/10/2026");
  });

  it("recusa até modelo aprovado, que é o único caminho fora da janela", async () => {
    const result = await authorizeConversationSend(
      sessaoCom(conversa({ opt_out_at: "2026-10-05T15:00:00Z" })),
      ator,
      "conv-1",
      { allowOutsideWindow: true },
    );

    expect(result.ok).toBe(false);
  });

  it("libera quem não pediu para sair", async () => {
    const result = await authorizeConversationSend(
      sessaoCom(conversa({ opt_out_at: null })),
      ator,
      "conv-1",
    );

    expect(result.ok).toBe(true);
  });
});
