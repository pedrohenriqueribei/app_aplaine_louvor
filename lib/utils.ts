import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(value: string | undefined | null): string {
  if (!value) return "";
  let cleanDigits = value.replace(/\D/g, "");
  if (cleanDigits.length > 11 && cleanDigits.startsWith("55")) {
    cleanDigits = cleanDigits.slice(2);
  }
  const digits = cleanDigits.slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;

  // Celulares com 9 dígitos: (99) 99999-9999
  if (digits.length === 11 || (digits[2] === "9" && digits.length > 6)) {
    if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  // Fixo ou dígitos intermediários: (99) 9999-9999
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Formata a data de nascimento para exibição no padrão brasileiro DD/MM.
 * Suporta Firestore Timestamp, Date, string no formato MM-DD, DD/MM, ISO ou objeto com seconds.
 */
export function formatBirthDate(value: any): string {
  if (!value) return "";
  try {
    // Se for Firestore Timestamp com toDate()
    if (typeof value.toDate === "function") {
      const d = value.toDate();
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      return `${day}/${month}`;
    }

    // Se for objeto serializado Timestamp { seconds, nanoseconds }
    if (typeof value.seconds === "number") {
      const d = new Date(value.seconds * 1000);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      return `${day}/${month}`;
    }

    // Se for instância Date
    if (value instanceof Date && !isNaN(value.getTime())) {
      const day = String(value.getDate()).padStart(2, "0");
      const month = String(value.getMonth() + 1).padStart(2, "0");
      return `${day}/${month}`;
    }

    // Se for string
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return "";

      // Caso formato DD/MM ou DD/MM/YYYY
      if (trimmed.includes("/")) {
        const parts = trimmed.split("/");
        if (parts.length >= 2) {
          const day = parts[0].padStart(2, "0");
          const month = parts[1].padStart(2, "0");
          return `${day}/${month}`;
        }
      }

      // Caso formato MM-DD ou YYYY-MM-DD
      if (trimmed.includes("-")) {
        const parts = trimmed.split("-");
        if (parts.length === 2) {
          // MM-DD
          const month = parts[0].padStart(2, "0");
          const day = parts[1].padStart(2, "0");
          return `${day}/${month}`;
        }
        if (parts.length === 3) {
          // YYYY-MM-DD
          const month = parts[1].padStart(2, "0");
          const day = parts[2].substring(0, 2).padStart(2, "0");
          return `${day}/${month}`;
        }
      }

      const parsedDate = new Date(trimmed);
      if (!isNaN(parsedDate.getTime())) {
        const day = String(parsedDate.getUTCDate()).padStart(2, "0");
        const month = String(parsedDate.getUTCMonth() + 1).padStart(2, "0");
        return `${day}/${month}`;
      }
    }
  } catch (err) {
    console.warn("Erro ao formatar data de nascimento:", err);
  }
  return "";
}

/**
 * Converte uma string no formato DD/MM (ou dia e mês) em um Timestamp do Firestore.
 * Utiliza o ano bissexto de referência 2000 (UTC 12:00) para preservar o dia e mês com segurança.
 * Retorna null se estiver vazio ou inválido.
 */
export function parseBirthDateToTimestamp(value: string | null | undefined): Timestamp | null {
  if (!value) return null;
  const clean = value.replace(/[^\d/]/g, "").trim();
  if (!clean) return null;

  const parts = clean.split("/");
  if (parts.length < 2) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  if (isNaN(day) || isNaN(month)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  // Validação de dias por mês (considerando ano bissexto 2000)
  const daysInMonths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonths[month - 1]) return null;

  const date = new Date(Date.UTC(2000, month - 1, day, 12, 0, 0));
  return Timestamp.fromDate(date);
}

/**
 * Máscara para digitação do campo Data de Nascimento no formato DD/MM (dia e mês).
 */
export function formatBirthDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
}

/**
 * Extrai o dia (1..31) e mês (0..11, 0-indexado) de nascimento a partir de qualquer formato de dataNascimento.
 */
export function extractBirthDayAndMonth(value: any): { day: number; month: number } | null {
  if (!value) return null;
  try {
    if (typeof value.toDate === "function") {
      const d = value.toDate();
      return { day: d.getDate(), month: d.getMonth() };
    }
    if (typeof value.seconds === "number") {
      const d = new Date(value.seconds * 1000);
      return { day: d.getDate(), month: d.getMonth() };
    }
    if (value instanceof Date && !isNaN(value.getTime())) {
      return { day: value.getDate(), month: value.getMonth() };
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (trimmed.includes("/")) {
        const parts = trimmed.split("/");
        if (parts.length >= 2) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          if (!isNaN(day) && !isNaN(month)) return { day, month };
        }
      }
      if (trimmed.includes("-")) {
        const parts = trimmed.split("-");
        if (parts.length === 2) {
          const month = parseInt(parts[0], 10) - 1;
          const day = parseInt(parts[1], 10);
          if (!isNaN(day) && !isNaN(month)) return { day, month };
        }
        if (parts.length === 3) {
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2].substring(0, 2), 10);
          if (!isNaN(day) && !isNaN(month)) return { day, month };
        }
      }
      const parsedDate = new Date(trimmed);
      if (!isNaN(parsedDate.getTime())) {
        return { day: parsedDate.getUTCDate(), month: parsedDate.getUTCMonth() };
      }
    }
  } catch (err) {
    console.warn("Erro ao extrair dia e mês:", err);
  }
  return null;
}

/**
 * Converte data de escala (string YYYY-MM-DD, ISO ou Timestamp) para milissegundos comparáveis.
 */
export function parseScheduleDateToTime(dateStr: any): number {
  if (!dateStr) return 0;
  if (typeof dateStr !== "string") {
    if (dateStr?.toDate && typeof dateStr.toDate === "function") {
      return dateStr.toDate().getTime();
    }
    return new Date(dateStr).getTime() || 0;
  }
  const clean = dateStr.trim().split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    return new Date(y, m - 1, d, 12, 0, 0).getTime();
  }
  const t = new Date(dateStr).getTime();
  return isNaN(t) ? 0 : t;
}

/**
 * Formata data de escala para exibição DD/MM/AAAA.
 */
export function formatScheduleDate(dateStr: any): string {
  if (!dateStr) return "";
  if (typeof dateStr !== "string") {
    if (dateStr?.toDate && typeof dateStr.toDate === "function") {
      return dateStr.toDate().toLocaleDateString("pt-BR");
    }
    return new Date(dateStr).toLocaleDateString("pt-BR");
  }
  const clean = dateStr.trim().split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("pt-BR");
    }
  } catch {}
  return dateStr;
}


