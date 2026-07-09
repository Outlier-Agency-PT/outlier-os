/** Segunda-feira da semana que contém `date`, formato YYYY-MM-DD */
export function toWeekStart(date: Date): string {
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}

/** Segunda-feira da semana actual, formato YYYY-MM-DD */
export function getCurrentWeekStart(): string {
  return toWeekStart(new Date());
}
