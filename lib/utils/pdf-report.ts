import type { StudentReport } from "@/lib/queries/student-reports";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RenderState {
  doc: any;
  y: number;
  margin: number;
  maxWidth: number;
  pageHeight: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function needsPage(state: RenderState, needed = 8): void {
  if (state.y + needed > state.pageHeight - 10) {
    state.doc.addPage();
    state.y = 20;
  }
}

function renderText(
  state: RenderState,
  text: string,
  size: number,
  style: "normal" | "bold" | "italic" = "normal",
  indent = 0,
  lineSpacing = 5
): void {
  if (!text.trim()) return;
  state.doc.setFontSize(size);
  state.doc.setFont("helvetica", style);
  const lines: string[] = state.doc.splitTextToSize(text, state.maxWidth - indent);
  needsPage(state, lines.length * lineSpacing + 2);
  state.doc.text(lines, state.margin + indent, state.y);
  state.y += lines.length * lineSpacing + 1;
}

function renderHRule(state: RenderState): void {
  needsPage(state, 6);
  state.doc.setDrawColor(200, 200, 200);
  state.doc.line(
    state.margin,
    state.y,
    state.margin + state.maxWidth,
    state.y
  );
  state.y += 5;
}

function stripInlineMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1");
}

// ── Section renderers ─────────────────────────────────────────────────────────

function renderH1(state: RenderState, text: string): void {
  needsPage(state, 16);
  state.y += 2;
  renderText(state, stripInlineMarkdown(text), 16, "bold", 0, 9);
  state.y += 3;
}

function renderH2(state: RenderState, text: string): void {
  needsPage(state, 14);
  state.y += 4;
  renderText(state, stripInlineMarkdown(text), 13, "bold", 0, 7);
  // Underline
  state.doc.setDrawColor(180, 180, 180);
  state.doc.line(state.margin, state.y, state.margin + state.maxWidth, state.y);
  state.y += 4;
}

function renderH3(state: RenderState, text: string): void {
  needsPage(state, 10);
  state.y += 2;
  renderText(state, stripInlineMarkdown(text), 11, "bold", 0, 6);
  state.y += 1;
}

function renderH4(state: RenderState, text: string): void {
  needsPage(state, 8);
  state.y += 1;
  renderText(state, stripInlineMarkdown(text), 10, "bold", 0, 5.5);
}

function renderParagraph(state: RenderState, text: string): void {
  if (!text.trim()) return;
  const clean = stripInlineMarkdown(text);
  renderText(state, clean, 9, "normal", 0, 5);
  state.y += 1;
}

function renderBullet(state: RenderState, text: string, indent = 3): void {
  const clean = stripInlineMarkdown(text);
  const allLines: string[] = state.doc.splitTextToSize(
    clean,
    state.maxWidth - indent - 4
  );
  needsPage(state, allLines.length * 4.5 + 1);
  state.doc.setFontSize(9);
  state.doc.setFont("helvetica", "normal");
  state.doc.text("•", state.margin + indent, state.y);
  state.doc.text(allLines, state.margin + indent + 4, state.y);
  state.y += allLines.length * 4.5 + 0.5;
}

function renderCheckbox(state: RenderState, checked: boolean, text: string): void {
  const mark = checked ? "[v]" : "[ ]";
  const clean = stripInlineMarkdown(text);
  const allLines: string[] = state.doc.splitTextToSize(
    clean,
    state.maxWidth - 10
  );
  needsPage(state, allLines.length * 4.5 + 1);
  state.doc.setFontSize(8.5);
  state.doc.setFont("helvetica", checked ? "bold" : "normal");
  state.doc.text(`${mark} ${allLines[0]}`, state.margin + 3, state.y);
  for (let i = 1; i < allLines.length; i++) {
    state.y += 4.5;
    state.doc.text(allLines[i], state.margin + 3 + 8, state.y);
  }
  state.y += 4.5 + 0.5;
}

function renderTableRow(
  state: RenderState,
  cells: string[],
  isHeader = false
): void {
  if (cells.length === 0) return;
  const clean = cells.map((c) => stripInlineMarkdown(c));
  const joined = clean.join("   |   ");
  needsPage(state, 5.5);
  state.doc.setFontSize(8.5);
  state.doc.setFont("helvetica", isHeader ? "bold" : "normal");
  const lines: string[] = state.doc.splitTextToSize(joined, state.maxWidth);
  state.doc.text(lines, state.margin, state.y);
  state.y += lines.length * 4.5 + 0.5;
}

// ── Main parser ───────────────────────────────────────────────────────────────

function parseLine(state: RenderState, line: string): void {
  // H1
  if (line.startsWith("# ")) {
    renderH1(state, line.slice(2));
    return;
  }
  // H2
  if (line.startsWith("## ")) {
    renderH2(state, line.slice(3));
    return;
  }
  // H3
  if (line.startsWith("### ")) {
    renderH3(state, line.slice(4));
    return;
  }
  // H4
  if (line.startsWith("#### ")) {
    renderH4(state, line.slice(5));
    return;
  }
  // HR
  if (line.match(/^---+$/)) {
    renderHRule(state);
    return;
  }
  // Table separator — skip
  if (line.match(/^\|[-| :]+\|$/)) {
    return;
  }
  // Table row
  if (line.startsWith("| ")) {
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    // Heuristic: first row of table is header if next line is separator — we
    // can't look ahead here so treat bold cells as header
    const isHeader = cells.some((c) => c.startsWith("**") || c.endsWith("**"));
    renderTableRow(state, cells, isHeader);
    return;
  }
  // Checkbox
  if (line.match(/^- \[[ xX]\]/)) {
    const checked = line.match(/^- \[[xX]\]/) !== null;
    const text = line.replace(/^- \[[ xX]\] /, "");
    renderCheckbox(state, checked, text);
    return;
  }
  // Bullet
  if (line.startsWith("- ")) {
    renderBullet(state, line.slice(2));
    return;
  }
  // Italic line (e.g. *footer*)
  if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
    renderText(state, line.replace(/^\*|\*$/g, ""), 8, "italic");
    return;
  }
  // Empty line
  if (line.trim() === "") {
    state.y += 2;
    return;
  }
  // Default paragraph
  renderParagraph(state, line);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function exportReportToPDF(report: StudentReport): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const state: RenderState = {
    doc,
    y: 20,
    margin: 14,
    maxWidth: doc.internal.pageSize.getWidth() - 28,
    pageHeight: doc.internal.pageSize.getHeight(),
  };

  const content = report.content_md ?? "";
  const lines = content.split("\n");

  for (const line of lines) {
    parseLine(state, line);
  }

  // Footer on every page
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 160);
    doc.text(
      `${report.title} · Pág. ${i}/${pageCount}`,
      state.margin,
      state.pageHeight - 6
    );
    doc.setTextColor(0, 0, 0);
  }

  const safeTitle = report.title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .replace(/\s+/g, "_");

  doc.save(`${safeTitle}.pdf`);
}
