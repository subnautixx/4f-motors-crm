import { describe, expect, it } from "vitest";
import { searchConversationsBeyondList } from "./queries";

/**
 * Cliente falso que grava cada chamada. A primeira consulta (clientes) devolve
 * `contatos`; a segunda (conversas) devolve vazio — aqui interessa a forma
 * das consultas, não o recorte.
 */
function clienteGravando(contatos: { id: string }[]) {
  const chamadas: { tabela: string; metodo: string; args: unknown[] }[] = [];

  const from = (tabela: string) => {
    const query: Record<string, unknown> = {};
    for (const metodo of ["select", "or", "eq", "in", "order", "limit", "gt"]) {
      query[metodo] = (...args: unknown[]) => {
        chamadas.push({ tabela, metodo, args });
        return query;
      };
    }
    query.then = (resolve: (v: unknown) => void) =>
      resolve({ data: tabela === "contacts" ? contatos : [], error: null });
    return query;
  };

  return { client: { from } as never, chamadas };
}

describe("searchConversationsBeyondList", () => {
  it("procura por nome e, com dígitos suficientes, por telefone", async () => {
    const { client, chamadas } = clienteGravando([{ id: "c-1" }]);
    await searchConversationsBeyondList(client, "Silva 98100");

    const or = chamadas.find((c) => c.tabela === "contacts" && c.metodo === "or");
    expect(or?.args[0]).toBe('full_name.ilike."%Silva 98100%",phone_e164.ilike."%98100%"');

    const porCliente = chamadas.find((c) => c.tabela === "conversations" && c.metodo === "in");
    expect(porCliente?.args).toEqual(["contact_id", ["c-1"]]);
  });

  it("não deixa vírgula, parênteses, aspas ou curinga mudarem o filtro", async () => {
    const { client, chamadas } = clienteGravando([]);
    await searchConversationsBeyondList(client, 'Ana (filha), "x"%_*');

    const or = chamadas.find((c) => c.metodo === "or");
    expect(or?.args[0]).toBe('full_name.ilike."%Ana filha x%"');
  });

  it("termo curto não vai ao banco, e sem cliente não busca conversa", async () => {
    const curto = clienteGravando([]);
    expect(await searchConversationsBeyondList(curto.client, "an")).toEqual([]);
    expect(curto.chamadas).toHaveLength(0);

    const vazio = clienteGravando([]);
    expect(await searchConversationsBeyondList(vazio.client, "Fulano")).toEqual([]);
    expect(vazio.chamadas.some((c) => c.tabela === "conversations")).toBe(false);
  });
});
