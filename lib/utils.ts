import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

export function formatDate(date: Date | string, format: "short" | "long" = "short") {
  const d = typeof date === "string" ? new Date(date) : date;
  if (format === "long") {
    return d.toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return d.toLocaleDateString("pt-PT");
}

export function formatRelative(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "hoje";
  if (days < 2) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(days / 365);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function calcularDiasRestantes(dataAlvo: string | Date): string {
  let d: Date;

  if (typeof dataAlvo === "string") {
    // Try as ISO/parseable date first (must contain a digit-dash pattern)
    const parsed = new Date(dataAlvo);
    if (!isNaN(parsed.getTime()) && /\d{4}-\d{2}-\d{2}/.test(dataAlvo)) {
      d = parsed;
    } else {
      // Text-based urgency phrase
      const lower = dataAlvo.toLowerCase().trim();
      const hoje = new Date();

      if (lower === "esta semana") {
        const daysLeft = 7 - hoje.getDay() || 7;
        return `em ${daysLeft} dias`;
      }
      if (lower === "próxima semana" || lower === "proxima semana") {
        return "em 14 dias";
      }
      const semanas = lower.match(/^(\d+)\s*semanas?$/);
      if (semanas) return `em ${parseInt(semanas[1]) * 7} dias`;
      const dias = lower.match(/^(\d+)\s*dias?$/);
      if (dias) return `em ${parseInt(dias[1])} dias`;

      return dataAlvo;
    }
  } else {
    d = dataAlvo;
  }

  const diff = d.getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return "atrasado";
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}
