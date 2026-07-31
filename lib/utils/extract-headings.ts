export interface Heading {
  level: 2 | 3;
  text: string;
  slug: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function extractHeadings(markdown: string | null): Heading[] {
  if (!markdown) return [];
  const lines = markdown.split("\n");
  const headings: Heading[] = [];
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    if (h2) headings.push({ level: 2, text: h2[1].trim(), slug: slugify(h2[1].trim()) });
    else if (h3) headings.push({ level: 3, text: h3[1].trim(), slug: slugify(h3[1].trim()) });
  }
  return headings;
}
