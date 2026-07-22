import { startOfWeek } from "date-fns";

export function getWeekStart(date?: Date): Date {
  return startOfWeek(date ?? new Date(), { weekStartsOn: 1 });
}
