/**
 * Lê um preço digitado do jeito brasileiro.
 *
 * Antes o campo apagava tudo que não era dígito, e "89.900,00" virava
 * 8990000: o carro era gravado por cem vezes o valor anunciado, sem aviso. Aqui
 * a vírgula é o decimal e o ponto é milhar — e o ponto só vira decimal quando
 * não pode ser milhar ("118900.5", que é como o banco devolve o valor salvo e
 * como ele reaparece no campo de edição).
 *
 * Devolve `null` para vazio e `NaN` para o que não dá para entender, para quem
 * chama poder avisar em vez de gravar um número errado.
 */
export function parseBRL(value: string): number | null {
  const raw = value.replace(/R\$/gi, "").replace(/\s/g, "");
  if (raw === "") return null;
  if (!/^\d[\d.,]*$/.test(raw)) return Number.NaN;

  let normalized: string;

  if (raw.includes(",")) {
    const [integer = "", decimals = "", ...rest] = raw.split(",");
    if (rest.length > 0 || decimals.length > 2 || !isThousands(integer)) return Number.NaN;
    normalized = `${integer.replace(/\./g, "")}.${decimals || "0"}`;
  } else if (raw.includes(".")) {
    const parts = raw.split(".");
    const last = parts[parts.length - 1] ?? "";
    if (isThousands(raw)) normalized = parts.join("");
    else if (parts.length === 2 && last.length >= 1 && last.length <= 2) normalized = raw;
    else return Number.NaN;
  } else {
    normalized = raw;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return Number.NaN;
  return Math.round(parsed * 100) / 100;
}

/** "89", "89.900", "1.234.567" — grupos de três depois do primeiro. */
function isThousands(value: string): boolean {
  return /^\d{1,3}(\.\d{3})*$/.test(value) || /^\d+$/.test(value);
}

/** Valor salvo -> texto do campo de edição, no mesmo formato que `parseBRL` lê. */
export function formatPriceInput(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

/** Aviso único para preço que não deu para ler, nos dois formulários. */
export const PRICE_INPUT_ERROR = "Preço não entendido. Escreva assim: 89.900 ou 89.900,00.";
