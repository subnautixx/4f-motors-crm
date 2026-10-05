import { APP_TIME_ZONE, addDaysInAppTz, dayKeyInAppTz } from "@/lib/time";

/**
 * Formatação de data e hora com fuso fixo da operação.
 *
 * Fixar o fuso é o que garante que o mesmo instante apareça igual no HTML
 * gerado no servidor (UTC) e no navegador do consignador (Brasília) — sem
 * isso, além do horário errado, cada timestamp causaria divergência de
 * hidratação no React.
 */

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
});

const shortDateYearFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const yearFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
});

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Horário no padrão de aplicativo de mensagem: hoje mostra a hora, ontem
 * mostra "Ontem", o resto mostra a data. Sem "há 3 minutos" — em operação, o
 * horário exato é mais útil que o relativo.
 */
export function formatListTime(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";

  const now = new Date();
  const key = dayKeyInAppTz(date);

  if (key === dayKeyInAppTz(now)) return timeFormatter.format(date);
  if (key === dayKeyInAppTz(addDaysInAppTz(now, -1))) return "Ontem";
  if (yearFormatter.format(date) === yearFormatter.format(now)) {
    return shortDateFormatter.format(date);
  }
  return shortDateYearFormatter.format(date);
}

export function formatTime(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? timeFormatter.format(date) : "";
}

export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? `${dateFormatter.format(date)} às ${timeFormatter.format(date)}` : "—";
}

export function formatDate(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "—";
}

/**
 * Distância em dias de calendário, no fuso da operação: 1 é amanhã, -1 é
 * ontem. As chaves de dia viram meia-noite UTC só para subtrair — a conta é
 * entre datas, não entre instantes.
 */
function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round(
    (Date.parse(dayKeyInAppTz(to)) - Date.parse(dayKeyInAppTz(from))) / 86_400_000,
  );
}

/**
 * Há quanto tempo, para colunas em que a pergunta é "faz muito ou pouco":
 * "há 3 min", "ontem", "há 4 dias". Numa lista de clientes, doze linhas de
 * "05/10/2026" pareciam todas iguais — e o ano era só ruído.
 *
 * `now` é obrigatório. Um relógio implícito daria um texto no HTML do servidor
 * e outro no navegador, e cada linha acusaria divergência de hidratação.
 */
export function formatRelativePast(
  value: string | null | undefined,
  now: Date | number,
): string {
  const date = toDate(value);
  if (!date) return "—";

  const reference = typeof now === "number" ? new Date(now) : now;
  const minutes = Math.floor((reference.getTime() - date.getTime()) / 60_000);
  const days = calendarDaysBetween(date, reference);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  if (days === 0) return `há ${Math.floor(minutes / 60)} h`;
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  if (yearFormatter.format(date) === yearFormatter.format(reference)) {
    return shortDateFormatter.format(date);
  }
  return shortDateYearFormatter.format(date);
}

/**
 * Data de compromisso: "hoje, 15:30", "amanhã, 09:00", "08/10, 14:00". A hora
 * fica sempre — "ligar amanhã" sem horário não serve para planejar o dia.
 */
export function formatAgenda(value: string | null | undefined, now: Date | number): string {
  const date = toDate(value);
  if (!date) return "—";

  const reference = typeof now === "number" ? new Date(now) : now;
  const days = calendarDaysBetween(reference, date);
  const time = timeFormatter.format(date);

  if (days === 0) return `hoje, ${time}`;
  if (days === 1) return `amanhã, ${time}`;
  if (days === -1) return `ontem, ${time}`;
  if (yearFormatter.format(date) === yearFormatter.format(reference)) {
    return `${shortDateFormatter.format(date)}, ${time}`;
  }
  return `${shortDateYearFormatter.format(date)}, ${time}`;
}

/** Separador de dia dentro da conversa. */
export function formatDayDivider(value: string): string {
  const date = toDate(value);
  if (!date) return "";

  const now = new Date();
  const key = dayKeyInAppTz(date);

  if (key === dayKeyInAppTz(now)) return "Hoje";
  if (key === dayKeyInAppTz(addDaysInAppTz(now, -1))) return "Ontem";

  return longDateFormatter.format(date);
}

/** Agrupamento por dia — usa o dia local, não o dia UTC. */
export function dayKey(value: string | null | undefined): string {
  return dayKeyInAppTz(value);
}
