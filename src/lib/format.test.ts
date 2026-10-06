import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dayKey,
  formatAgenda,
  formatDate,
  formatDateTime,
  formatDayDivider,
  formatListTime,
  formatRelativePast,
  formatTime,
} from "./format";

// O runtime dos testes é UTC, como a Vercel. Tudo aqui verifica que a saída
// sai no fuso de Brasília mesmo assim.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-12T18:30:00Z")); // 15:30 em São Paulo
});

afterEach(() => {
  vi.useRealTimers();
});

describe("formatTime", () => {
  it("converte para o horário de Brasília", () => {
    expect(formatTime("2026-08-12T19:32:00Z")).toBe("16:32");
  });

  it("mostra 00:xx e não 24:xx na virada", () => {
    expect(formatTime("2026-08-12T03:05:00Z")).toBe("00:05");
  });
});

describe("formatListTime", () => {
  it("mostra a hora para mensagens de hoje", () => {
    expect(formatListTime("2026-08-12T17:00:00Z")).toBe("14:00");
  });

  it("trata 22h locais como hoje, mesmo já sendo o dia seguinte em UTC", () => {
    vi.setSystemTime(new Date("2026-08-13T01:30:00Z")); // 12/08, 22:30 local
    expect(formatListTime("2026-08-13T01:00:00Z")).toBe("22:00");
  });

  it("mostra Ontem para o dia anterior", () => {
    expect(formatListTime("2026-08-11T17:00:00Z")).toBe("Ontem");
  });

  it("mostra dia/mês no mesmo ano", () => {
    expect(formatListTime("2026-03-04T17:00:00Z")).toBe("04/03");
  });

  it("inclui o ano em datas de anos anteriores", () => {
    expect(formatListTime("2025-03-04T17:00:00Z")).toBe("04/03/25");
  });

  it("devolve vazio para valor ausente", () => {
    expect(formatListTime(null)).toBe("");
  });
});

describe("formatDate e formatDateTime", () => {
  it("usa o dia local", () => {
    // 01:00Z do dia 13 é 12/08 às 22:00 em São Paulo.
    expect(formatDate("2026-08-13T01:00:00Z")).toBe("12/08/2026");
    expect(formatDateTime("2026-08-13T01:00:00Z")).toBe("12/08/2026 às 22:00");
  });

  it("mostra travessão quando não há data", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });
});

describe("formatDayDivider", () => {
  it("identifica hoje e ontem", () => {
    expect(formatDayDivider("2026-08-12T17:00:00Z")).toBe("Hoje");
    expect(formatDayDivider("2026-08-11T17:00:00Z")).toBe("Ontem");
  });

  it("escreve a data por extenso nos demais dias", () => {
    expect(formatDayDivider("2026-08-03T17:00:00Z")).toContain("agosto");
  });
});

describe("dayKey", () => {
  it("agrupa pelo dia local, não pelo UTC", () => {
    // As duas mensagens são do dia 12 em São Paulo, apesar de UTC diferente.
    expect(dayKey("2026-08-12T23:00:00Z")).toBe(dayKey("2026-08-13T01:00:00Z"));
  });
});

describe("formatRelativePast", () => {
  // 12/08, 15:30 em São Paulo. O relógio vem por parâmetro, não do sistema.
  const agora = new Date("2026-08-12T18:30:00Z");

  it("diz agora no primeiro minuto", () => {
    expect(formatRelativePast("2026-08-12T18:29:30Z", agora)).toBe("agora");
  });

  it("conta minutos e horas dentro do mesmo dia", () => {
    expect(formatRelativePast("2026-08-12T18:27:00Z", agora)).toBe("há 3 min");
    expect(formatRelativePast("2026-08-12T13:00:00Z", agora)).toBe("há 5 h");
  });

  it("vira ontem pelo dia local, não por 24 horas", () => {
    // 11/08 às 23:00 local foi há 16h30, mas já é ontem.
    expect(formatRelativePast("2026-08-12T02:00:00Z", agora)).toBe("ontem");
  });

  it("conta dias na semana e cai para a data depois", () => {
    expect(formatRelativePast("2026-08-08T15:00:00Z", agora)).toBe("há 4 dias");
    expect(formatRelativePast("2026-07-20T15:00:00Z", agora)).toBe("20/07");
    expect(formatRelativePast("2025-12-20T15:00:00Z", agora)).toBe("20/12/25");
  });

  it("aceita o relógio em milissegundos e mostra travessão sem data", () => {
    expect(formatRelativePast("2026-08-12T18:20:00Z", agora.getTime())).toBe("há 10 min");
    expect(formatRelativePast(null, agora)).toBe("—");
  });
});

describe("formatAgenda", () => {
  const agora = new Date("2026-08-12T18:30:00Z"); // 12/08, 15:30 local

  it("nomeia hoje, amanhã e ontem pelo dia local", () => {
    expect(formatAgenda("2026-08-12T20:00:00Z", agora)).toBe("hoje, 17:00");
    // 13/08 às 01:00Z ainda é 12/08 às 22:00 em São Paulo.
    expect(formatAgenda("2026-08-13T01:00:00Z", agora)).toBe("hoje, 22:00");
    expect(formatAgenda("2026-08-13T12:00:00Z", agora)).toBe("amanhã, 09:00");
    expect(formatAgenda("2026-08-11T12:00:00Z", agora)).toBe("ontem, 09:00");
  });

  it("mostra a data com a hora nos demais dias", () => {
    expect(formatAgenda("2026-08-20T17:00:00Z", agora)).toBe("20/08, 14:00");
    expect(formatAgenda("2027-01-05T17:00:00Z", agora)).toBe("05/01/27, 14:00");
  });
});
