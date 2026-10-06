import { describe, expect, it } from "vitest";
import { formatPriceInput, parseBRL } from "./money";

describe("parseBRL", () => {
  it("lê o valor com centavos sem multiplicar por cem", () => {
    // Regressão: "89.900,00" era gravado como 8.990.000.
    expect(parseBRL("89.900,00")).toBe(89900);
    expect(parseBRL("R$ 89.900,50")).toBe(89900.5);
  });

  it("aceita o número cru, com milhar ou com espaço", () => {
    expect(parseBRL("89900")).toBe(89900);
    expect(parseBRL("89.900")).toBe(89900);
    expect(parseBRL("1.234.567")).toBe(1234567);
    expect(parseBRL(" 89 900 ")).toBe(89900);
  });

  it("entende o valor como o banco devolve, que volta no campo de edição", () => {
    expect(parseBRL("118900")).toBe(118900);
    expect(parseBRL("118900.5")).toBe(118900.5);
    expect(parseBRL("118900.50")).toBe(118900.5);
  });

  it("vazio é nulo; o que não dá para entender é NaN, para avisar em vez de gravar", () => {
    expect(parseBRL("")).toBeNull();
    expect(parseBRL("   ")).toBeNull();
    expect(parseBRL("89 mil")).toBeNaN();
    expect(parseBRL("89.900.00")).toBeNaN();
    expect(parseBRL("89,900,00")).toBeNaN();
    expect(parseBRL("8.99")).toBe(8.99);
    expect(parseBRL("0")).toBeNaN();
  });
});

describe("formatPriceInput", () => {
  it("volta para o campo num formato que o parseBRL lê igual", () => {
    for (const valor of [89900, 118900.5, 1234567.89]) {
      expect(parseBRL(formatPriceInput(valor))).toBe(valor);
    }
    expect(formatPriceInput(null)).toBe("");
  });
});
