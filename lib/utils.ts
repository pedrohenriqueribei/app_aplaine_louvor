import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
