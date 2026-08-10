import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SHEET_ID = "1zpmqnMLWKbxZDF323T70Zvjt6QWT5v55dfaVnaln2K4";
const GID = "1505798196";

export async function POST() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Falha ao ler Google Sheet");

    const csv = await res.text();
    const lines = csv.split("\n").slice(1);

    const supabase = await createClient();

    let updated = 0;
    let created = 0;
    let skipped = 0;

    function parseDate(raw: string): string | null {
      if (!raw) return null;

      // Número de série do Excel (ex: 46076)
      const serial = parseInt(raw);
      if (!isNaN(serial) && raw.trim() === String(serial) && serial > 40000 && serial < 60000) {
        // Excel epoch: 1 Janeiro 1900, com bug do ano bissexto 1900
        const date = new Date((serial - 25569) * 86400 * 1000);
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, "0");
        const d = String(date.getUTCDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }

      // DD/MM/YYYY
      const dmY = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dmY) return `${dmY[3]}-${dmY[2].padStart(2,"0")}-${dmY[1].padStart(2,"0")}`;

      // ISO (YYYY-MM-DD HH:MM:SS)
      const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
      if (iso) return iso[1];

      return null;
    }

    function mapLevel(raw: string): "aprendiz" | "fazedor" | "referencia" | "suspenso" | null {
      const normalized = raw.toLowerCase().trim();
      if (normalized === "aprendiz") return "aprendiz";
      if (normalized === "fazedor") return "fazedor";
      if (normalized === "autoridade" || normalized === "referencia" || normalized === "referência") return "referencia";
      if (normalized === "suspenso") return "suspenso";
      return null;
    }

    for (const line of lines) {
      const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? [];
      const clean = (s?: string) => (s ?? "").replace(/^"|"$/g, "").trim();

      const name = clean(cols[0]);
      const email = clean(cols[1]);
      const situacao = clean(cols[2]);
      const phone = clean(cols[3]);
      const startDateRaw = clean(cols[4]);
      const mentoriaRaw = clean(cols[5]);
      const renewalDate1Raw = clean(cols[6]);
      const renewalDate2Raw = clean(cols[7]);
      const renewalYear1 = clean(cols[8]);
      const renewalYear2 = clean(cols[9]);
      const strategicDateRaw = clean(cols[10]);
      const instagram = clean(cols[11]);

      if (!email || !name) { skipped++; continue; }

      const payload: Record<string, unknown> = {
        name,
        email,
        status: situacao?.toLowerCase() === "ativo" ? "ativo" : "inativo",
        phone: phone || null,
        instagram: instagram || null,
        mentoria_individual: mentoriaRaw?.toLowerCase() === "sim",
        renewal_date_1: renewalDate1Raw || null,
        renewal_date_2: renewalDate2Raw || null,
        renewal_year_1: renewalYear1 || null,
        renewal_year_2: renewalYear2 || null,
        strategic_session_date: strategicDateRaw || null,
        start_date: parseDate(startDateRaw),
      };

      const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        await supabase.from("students").update(payload).eq("id", existing.id);
        updated++;
      } else {
        await supabase.from("students").insert({ ...payload, level: "aprendiz" });
        created++;
      }
    }

    // --- Segundo ficheiro: Ponto de Situação - Aprendiz_Maria ---
    const SHEET2_ID = "1uVYTn0nHprvezojYbbNAUPSYXJPaD4Ui";
    const SHEET2_GID = "1580348812";

    const url2 = `https://docs.google.com/spreadsheets/d/${SHEET2_ID}/export?format=csv&gid=${SHEET2_GID}`;
    const res2 = await fetch(url2, { cache: "no-store" });
    if (!res2.ok) throw new Error("Falha ao ler segundo Google Sheet");

    const csv2 = await res2.text();
    const lines2 = csv2.split("\n");

    const notesMap = new Map<string, string[]>();
    const coachDataMap = new Map<string, {
      revenue_generated?: number | null;
      suggested_level?: string;
      appears_in_sessions?: string;
      nicho?: string;
      motivation?: number | null;
      strategic_session_date?: string;
    }>();

    for (const line of lines2) {
      const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? [];
      const clean = (s?: string) => (s ?? "").replace(/^"|"$/g, "").trim();

      const name = clean(cols[1]);
      const email = clean(cols[2]);
      const sessionDateRaw = clean(cols[11]);
      const revenueRaw = clean(cols[4]);
      const suggestedLevel = clean(cols[6]);
      const appearsInSessions = clean(cols[8]);
      const notes = clean(cols[9]);
      const nicho = clean(cols[10]);
      const motivationRaw = clean(cols[12]);

      if (!email || !email.includes("@")) continue;
      if (name.toLowerCase().includes("média") || name.toLowerCase().includes("media")) continue;

      if (notes) {
        if (!notesMap.has(email)) notesMap.set(email, []);
        const existing = notesMap.get(email)!;
        if (!existing.includes(notes)) existing.push(notes);
      }

      const revenueNum = revenueRaw
        ? parseFloat(revenueRaw.replace(/[€\s.]/g, "").replace(",", ".").replace(/[^0-9.]/g, ""))
        : null;

      coachDataMap.set(email, {
        revenue_generated: isNaN(revenueNum as number) ? null : revenueNum,
        suggested_level: suggestedLevel || undefined,
        appears_in_sessions: appearsInSessions || undefined,
        nicho: nicho || undefined,
        motivation: motivationRaw ? parseFloat(motivationRaw) : null,
        strategic_session_date: parseDate(sessionDateRaw) || undefined,
      });
    }

    for (const [email, data] of coachDataMap.entries()) {
      const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (!existing) { skipped++; continue; }

      const notes = notesMap.get(email);
      const coach_notes = notes && notes.length > 0 ? notes.join("\n\n---\n\n") : null;

      const payload: Record<string, unknown> = {};
      if (data.revenue_generated !== null && data.revenue_generated !== undefined) payload.revenue_generated = data.revenue_generated;
      if (data.suggested_level) payload.suggested_level = data.suggested_level;
      if (data.appears_in_sessions) payload.appears_in_sessions = data.appears_in_sessions;
      if (data.nicho) payload.nicho = data.nicho;
      if (data.motivation !== null && data.motivation !== undefined) payload.motivation = data.motivation;
      if (data.strategic_session_date) payload.strategic_session_date = data.strategic_session_date;
      if (coach_notes) payload.coach_notes = coach_notes;

      if (Object.keys(payload).length > 0) {
        await supabase.from("students").update(payload).eq("id", existing.id);
        updated++;
      }
    }

    // --- Terceiro ficheiro: Ponto de Situação - Fazedor ---
    const SHEET3_GID = "2100369251";
    const coachMap: Record<string, string> = {
      "maria": "83acfcfb-31fd-4af2-80df-28d5aab8f485",
      "maria joão": "83acfcfb-31fd-4af2-80df-28d5aab8f485",
      "maria joao": "83acfcfb-31fd-4af2-80df-28d5aab8f485",
    };

    const url3 = `https://docs.google.com/spreadsheets/d/${SHEET2_ID}/export?format=csv&gid=${SHEET3_GID}`;
    const res3 = await fetch(url3, { cache: "no-store" });
    if (!res3.ok) throw new Error("Falha ao ler aba Fazedor");

    const csv3 = await res3.text();
    const lines3 = csv3.split("\n");

    const notesMap3 = new Map<string, string[]>();
    const coachDataMap3 = new Map<string, {
      name: string;
      start_date?: string | null;
      level: "aprendiz" | "fazedor" | "referencia" | "suspenso";
      revenue_generated?: number | null;
      suggested_level?: string;
      appears_in_sessions?: string;
      nicho?: string;
      motivation?: number | null;
      strategic_session_date?: string;
      coach_id?: string | null;
    }>();

    for (const line of lines3) {
      const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? [];
      const clean = (s?: string) => (s ?? "").replace(/^"|"$/g, "").trim();

      const name = clean(cols[1]);
      const email = clean(cols[2]);
      const startDateRaw = clean(cols[3]);
      const revenueRaw = clean(cols[4]);
      const mappedLevel = mapLevel(clean(cols[5])) ?? "fazedor";
      const suggestedLevel = clean(cols[6]);
      const coachName = clean(cols[7]);
      const appearsInSessions = clean(cols[8]);
      const notes = clean(cols[9]);
      const nicho = clean(cols[10]);
      const sessionDateRaw = clean(cols[11]);
      const motivationRaw = clean(cols[12]);

      if (!email || !email.includes("@")) continue;
      if (name.toLowerCase().includes("média") || name.toLowerCase().includes("media")) continue;

      if (notes) {
        if (!notesMap3.has(email)) notesMap3.set(email, []);
        const existing = notesMap3.get(email)!;
        if (!existing.includes(notes)) existing.push(notes);
      }

      const revenueNum = revenueRaw
        ? parseFloat(revenueRaw.replace(/[€\s.]/g, "").replace(",", ".").replace(/[^0-9.]/g, ""))
        : null;

      coachDataMap3.set(email, {
        name,
        level: mappedLevel,
        start_date: parseDate(startDateRaw),
        revenue_generated: isNaN(revenueNum as number) ? null : revenueNum,
        suggested_level: suggestedLevel || undefined,
        appears_in_sessions: appearsInSessions || undefined,
        nicho: nicho || undefined,
        motivation: motivationRaw ? parseFloat(motivationRaw) : null,
        strategic_session_date: parseDate(sessionDateRaw) || undefined,
        coach_id: coachMap[coachName.toLowerCase()] ?? null,
      });
    }

    for (const [email, data] of coachDataMap3.entries()) {
      const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      const notes3 = notesMap3.get(email);
      const coach_notes = notes3 && notes3.length > 0 ? notes3.join("\n\n---\n\n") : null;

      const payload: Record<string, unknown> = {
        level: data.level,
      };
      if (data.revenue_generated !== null && data.revenue_generated !== undefined) payload.revenue_generated = data.revenue_generated;
      if (data.suggested_level) payload.suggested_level = data.suggested_level;
      if (data.appears_in_sessions) payload.appears_in_sessions = data.appears_in_sessions;
      if (data.nicho) payload.nicho = data.nicho;
      if (data.motivation !== null && data.motivation !== undefined) payload.motivation = data.motivation;
      if (data.strategic_session_date) payload.strategic_session_date = data.strategic_session_date;
      if (coach_notes) payload.coach_notes = coach_notes;
      if (data.coach_id !== undefined) payload.coach_id = data.coach_id;

      if (existing) {
        await supabase.from("students").update(payload).eq("id", existing.id);
        updated++;
      } else {
        await supabase.from("students").insert({
          ...payload,
          name: data.name,
          email,
          status: "ativo",
          start_date: data.start_date,
        });
        created++;
      }
    }

    return NextResponse.json({ ok: true, updated, created, skipped });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
