export function extractChecklistItems(markdown: string | null): string[] {
  if (!markdown) return [];
  return markdown
    .split("\n")
    .filter((line) => /^[-*]\s+.+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim());
}
