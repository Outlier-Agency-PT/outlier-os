"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Star,
  Archive,
  Copy,
  Pencil,
  X,
  ChevronLeft,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionStatusBadge } from "@/components/ui/section-status-badge";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { toast } from "sonner";
import {
  getMyAudienceProfilesAction,
  createAudienceProfileAction,
  updateAudienceProfileAction,
  setPrimaryAudienceProfileAction,
  archiveAudienceProfileAction,
  duplicateAudienceProfileAction,
  submitAudienceForReviewAction,
} from "@/lib/actions/audience";
import type { AudienceProfile, PersonaMarca, ConteudoConsumido } from "@/lib/queries/audience";
import type { ReviewStatus } from "@/lib/types/review-status";

// ── Form data type ────────────────────────────────────────────────────────────

type FormData = {
  name: string;
  faixa_etaria: string;
  genero: string;
  estatuto_social: string;
  rendimento: string;
  nucleo_familiar: string;
  area_profissional: string;
  habilitacoes: string;
  problemas: string[];
  dores: string[];
  medos: string[];
  frustracoes: string[];
  desafios: string[];
  tentativas_anteriores: string[];
  porque_nao_resolveu: string;
  transformacoes: string[];
  beneficios: string[];
  sonhos_objetivos: string[];
  como_quer_sentir: string;
  definicao_sucesso: string;
  redes_sociais: string[];
  pessoas_marcas_seguidas: PersonaMarca[];
  conteudos_consumidos: ConteudoConsumido[];
  linguagem: string[];
  fatores_decisao: string[];
  barreiras: string[];
};

function profileToForm(p: AudienceProfile): FormData {
  return {
    name: p.name,
    faixa_etaria: p.faixa_etaria ?? "",
    genero: p.genero ?? "",
    estatuto_social: p.estatuto_social ?? "",
    rendimento: p.rendimento ?? "",
    nucleo_familiar: p.nucleo_familiar ?? "",
    area_profissional: p.area_profissional ?? "",
    habilitacoes: p.habilitacoes ?? "",
    problemas: p.problemas ?? [],
    dores: p.dores ?? [],
    medos: p.medos ?? [],
    frustracoes: p.frustracoes ?? [],
    desafios: p.desafios ?? [],
    tentativas_anteriores: p.tentativas_anteriores ?? [],
    porque_nao_resolveu: p.porque_nao_resolveu ?? "",
    transformacoes: p.transformacoes ?? [],
    beneficios: p.beneficios ?? [],
    sonhos_objetivos: p.sonhos_objetivos ?? [],
    como_quer_sentir: p.como_quer_sentir ?? "",
    definicao_sucesso: p.definicao_sucesso ?? "",
    redes_sociais: p.redes_sociais ?? [],
    pessoas_marcas_seguidas: (p.pessoas_marcas_seguidas as PersonaMarca[]) ?? [],
    conteudos_consumidos: (p.conteudos_consumidos as ConteudoConsumido[]) ?? [],
    linguagem: p.linguagem ?? [],
    fatores_decisao: p.fatores_decisao ?? [],
    barreiras: p.barreiras ?? [],
  };
}

type FilterType = "todos" | "principal" | "rascunho" | "arquivados";

// ── TagInput ──────────────────────────────────────────────────────────────────

function TagInput({
  values,
  onChange,
  placeholder,
  readOnly,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const [input, setInput] = useState("");

  function add() {
    const t = input.trim();
    if (!t || values.includes(t)) return;
    onChange([...values, t]);
    setInput("");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs"
          >
            {v}
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {!readOnly && (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); add(); }
            }}
            placeholder={placeholder}
            className="h-8 text-sm"
          />
          <Button type="button" size="sm" variant="outline" onClick={add} className="h-8 shrink-0">
            Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}

// ── ObjectRowInput (pessoas_marcas, conteudos) ────────────────────────────────

function PersonaMarcaInput({
  values,
  onChange,
  readOnly,
}: {
  values: PersonaMarca[];
  onChange: (v: PersonaMarca[]) => void;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState<PersonaMarca>({ nome: "", url: "", motivo: "" });

  function add() {
    if (!draft.nome.trim()) return;
    onChange([...values, { ...draft, nome: draft.nome.trim() }]);
    setDraft({ nome: "", url: "", motivo: "" });
  }

  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex items-start gap-2 rounded-md border bg-muted/40 p-2 text-xs">
          <div className="flex-1 space-y-0.5">
            <p className="font-medium">{v.nome}</p>
            {v.url && <p className="text-muted-foreground">{v.url}</p>}
            {v.motivo && <p className="text-muted-foreground">{v.motivo}</p>}
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <div className="space-y-1.5 rounded-md border border-dashed p-2">
          <Input
            value={draft.nome}
            onChange={(e) => setDraft((d) => ({ ...d, nome: e.target.value }))}
            placeholder="Nome ou marca"
            className="h-8 text-xs"
          />
          <Input
            value={draft.url ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
            placeholder="URL (opcional)"
            className="h-8 text-xs"
          />
          <Input
            value={draft.motivo ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, motivo: e.target.value }))}
            placeholder="Porquê que o teu avatar a segue? (opcional)"
            className="h-8 text-xs"
          />
          <Button type="button" size="sm" variant="outline" onClick={add} className="h-7 text-xs">
            Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}

function ConteudoConsumidoInput({
  values,
  onChange,
  readOnly,
}: {
  values: ConteudoConsumido[];
  onChange: (v: ConteudoConsumido[]) => void;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState<ConteudoConsumido>({ formato: "", tema: "" });

  function add() {
    if (!draft.formato.trim() && !draft.tema.trim()) return;
    onChange([...values, { ...draft }]);
    setDraft({ formato: "", tema: "" });
  }

  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-xs">
          <span className="font-medium">{v.formato}</span>
          {v.tema && <span className="text-muted-foreground">— {v.tema}</span>}
          {!readOnly && (
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="ml-auto text-muted-foreground hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <div className="flex gap-2">
          <Input
            value={draft.formato}
            onChange={(e) => setDraft((d) => ({ ...d, formato: e.target.value }))}
            placeholder="Formato (ex: Podcast, Reels)"
            className="h-8 text-xs"
          />
          <Input
            value={draft.tema}
            onChange={(e) => setDraft((d) => ({ ...d, tema: e.target.value }))}
            placeholder="Tema"
            className="h-8 text-xs"
          />
          <Button type="button" size="sm" variant="outline" onClick={add} className="h-8 shrink-0">
            +
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
      {children}
    </p>
  );
}

// ── Profile Form ──────────────────────────────────────────────────────────────

const SECTIONS = [
  { key: "identificacao", label: "Identificação" },
  { key: "atual", label: "Situação Actual" },
  { key: "desejada", label: "Situação Desejada" },
  { key: "comportamento", label: "Comportamento" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

function ProfileForm({
  profile,
  onClose,
  onUpdate,
  readOnly = false,
}: {
  profile: AudienceProfile;
  onClose: () => void;
  onUpdate: (updated: AudienceProfile) => void;
  readOnly?: boolean;
}) {
  const [form, setForm] = useState<FormData>(profileToForm(profile));
  const [section, setSection] = useState<SectionKey>("identificacao");
  const [submitting, setSubmitting] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(
    profile.review_status as ReviewStatus,
  );

  const save = useAutosave(async (data: FormData) => {
    const result = await updateAudienceProfileAction(profile.id, {
      name: data.name,
      faixa_etaria: data.faixa_etaria || null,
      genero: data.genero || null,
      estatuto_social: data.estatuto_social || null,
      rendimento: data.rendimento || null,
      nucleo_familiar: data.nucleo_familiar || null,
      area_profissional: data.area_profissional || null,
      habilitacoes: data.habilitacoes || null,
      problemas: data.problemas,
      dores: data.dores,
      medos: data.medos,
      frustracoes: data.frustracoes,
      desafios: data.desafios,
      tentativas_anteriores: data.tentativas_anteriores,
      porque_nao_resolveu: data.porque_nao_resolveu || null,
      transformacoes: data.transformacoes,
      beneficios: data.beneficios,
      sonhos_objetivos: data.sonhos_objetivos,
      como_quer_sentir: data.como_quer_sentir || null,
      definicao_sucesso: data.definicao_sucesso || null,
      redes_sociais: data.redes_sociais,
      pessoas_marcas_seguidas: data.pessoas_marcas_seguidas,
      conteudos_consumidos: data.conteudos_consumidos,
      linguagem: data.linguagem,
      fatores_decisao: data.fatores_decisao,
      barreiras: data.barreiras,
    });
    if (result && "error" in result) toast.error(result.error);
    else {
      // Avança o estado local se passou de nao_iniciado
      if (reviewStatus === "nao_iniciado") setReviewStatus("em_preenchimento");
      onUpdate({ ...profile, ...data, review_status: reviewStatus === "nao_iniciado" ? "em_preenchimento" : reviewStatus });
    }
  }, 1500);

  function update<K extends keyof FormData>(field: K, value: FormData[K]) {
    if (readOnly) return;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      save(next);
      return next;
    });
  }

  async function handleSubmitForReview() {
    setSubmitting(true);
    const result = await submitAudienceForReviewAction(profile.id);
    setSubmitting(false);
    if (result && "error" in result) {
      toast.error(result.error);
    } else {
      setReviewStatus("pronto_revisao");
      onUpdate({ ...profile, review_status: "pronto_revisao" });
      toast.success("Perfil enviado para revisão");
    }
  }

  const canSubmit =
    !readOnly &&
    reviewStatus !== "pronto_revisao" &&
    reviewStatus !== "aprovado" &&
    reviewStatus !== "arquivado";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b p-4">
        <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {readOnly ? (
            <h3 className="font-semibold truncate">{form.name}</h3>
          ) : (
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="h-8 max-w-xs font-semibold"
              placeholder="Nome do perfil"
            />
          )}
          <SectionStatusBadge status={reviewStatus} />
          {profile.is_primary && (
            <Badge className="rounded-full border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
              Principal
            </Badge>
          )}
        </div>
        {canSubmit && (
          <Button size="sm" onClick={handleSubmitForReview} disabled={submitting}>
            <Send className="mr-1.5 size-3.5" />
            {submitting ? "A enviar..." : "Enviar para revisão"}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              section === s.key
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {section === "identificacao" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Faixa etária</FieldLabel>
                <Input value={form.faixa_etaria} onChange={(e) => update("faixa_etaria", e.target.value)} placeholder="ex: 30–45 anos" className="text-sm" disabled={readOnly} />
              </div>
              <div>
                <FieldLabel>Género</FieldLabel>
                <Input value={form.genero} onChange={(e) => update("genero", e.target.value)} placeholder="ex: Maioritariamente feminino" className="text-sm" disabled={readOnly} />
              </div>
              <div>
                <FieldLabel>Estatuto social</FieldLabel>
                <Input value={form.estatuto_social} onChange={(e) => update("estatuto_social", e.target.value)} placeholder="ex: Classe média" className="text-sm" disabled={readOnly} />
              </div>
              <div>
                <FieldLabel>Rendimento mensal</FieldLabel>
                <Input value={form.rendimento} onChange={(e) => update("rendimento", e.target.value)} placeholder="ex: 1 200–2 500€" className="text-sm" disabled={readOnly} />
              </div>
              <div>
                <FieldLabel>Núcleo familiar</FieldLabel>
                <Input value={form.nucleo_familiar} onChange={(e) => update("nucleo_familiar", e.target.value)} placeholder="ex: Casado/a, 2 filhos" className="text-sm" disabled={readOnly} />
              </div>
              <div>
                <FieldLabel>Área profissional</FieldLabel>
                <Input value={form.area_profissional} onChange={(e) => update("area_profissional", e.target.value)} placeholder="ex: Saúde / Bem-estar" className="text-sm" disabled={readOnly} />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Habilitações literárias</FieldLabel>
                <Input value={form.habilitacoes} onChange={(e) => update("habilitacoes", e.target.value)} placeholder="ex: Licenciatura" className="text-sm" disabled={readOnly} />
              </div>
            </div>
          </>
        )}

        {section === "atual" && (
          <>
            <div>
              <FieldLabel>Problemas que enfrenta</FieldLabel>
              <TagInput values={form.problemas} onChange={(v) => update("problemas", v)} placeholder="Adiciona um problema e prime Enter" readOnly={readOnly} />
            </div>
            <div>
              <FieldLabel>Dores (emocionais e práticas)</FieldLabel>
              <TagInput values={form.dores} onChange={(v) => update("dores", v)} placeholder="Adiciona uma dor" readOnly={readOnly} />
            </div>
            <div>
              <FieldLabel>Medos</FieldLabel>
              <TagInput values={form.medos} onChange={(v) => update("medos", v)} placeholder="Adiciona um medo" readOnly={readOnly} />
            </div>
            <div>
              <FieldLabel>Frustrações</FieldLabel>
              <TagInput values={form.frustracoes} onChange={(v) => update("frustracoes", v)} placeholder="Adiciona uma frustração" readOnly={readOnly} />
            </div>
            <div>
              <FieldLabel>Desafios do dia-a-dia</FieldLabel>
              <TagInput values={form.desafios} onChange={(v) => update("desafios", v)} placeholder="Adiciona um desafio" readOnly={readOnly} />
            </div>
            <div>
              <FieldLabel>O que já tentou fazer para resolver</FieldLabel>
              <TagInput values={form.tentativas_anteriores} onChange={(v) => update("tentativas_anteriores", v)} placeholder="Adiciona uma tentativa anterior" readOnly={readOnly} />
            </div>
            <div>
              <FieldLabel>Porque é que ainda não resolveu</FieldLabel>
              <Textarea
                value={form.porque_nao_resolveu}
                onChange={(e) => update("porque_nao_resolveu", e.target.value)}
                placeholder="O que impediu até agora?"
                rows={3}
                className="text-sm resize-none"
                disabled={readOnly}
              />
            </div>
          </>
        )}

        {section === "desejada" && (
          <>
            <div>
              <FieldLabel>Transformações que quer ver</FieldLabel>
              <TagInput values={form.transformacoes} onChange={(v) => update("transformacoes", v)} placeholder="Adiciona uma transformação" readOnly={readOnly} />
            </div>
            <div>
              <FieldLabel>Benefícios que procura</FieldLabel>
              <TagInput values={form.beneficios} onChange={(v) => update("beneficios", v)} placeholder="Adiciona um benefício" readOnly={readOnly} />
            </div>
            <div>
              <FieldLabel>Sonhos e objectivos</FieldLabel>
              <TagInput values={form.sonhos_objetivos} onChange={(v) => update("sonhos_objetivos", v)} placeholder="Adiciona um sonho ou objectivo" readOnly={readOnly} />
            </div>
            <div>
              <FieldLabel>Como quer sentir-se</FieldLabel>
              <Textarea
                value={form.como_quer_sentir}
                onChange={(e) => update("como_quer_sentir", e.target.value)}
                placeholder="Descreve o estado emocional desejado..."
                rows={3}
                className="text-sm resize-none"
                disabled={readOnly}
              />
            </div>
            <div>
              <FieldLabel>Definição de sucesso para esta pessoa</FieldLabel>
              <Textarea
                value={form.definicao_sucesso}
                onChange={(e) => update("definicao_sucesso", e.target.value)}
                placeholder="Para ela, o sucesso é..."
                rows={3}
                className="text-sm resize-none"
                disabled={readOnly}
              />
            </div>
          </>
        )}

        {section === "comportamento" && (
          <>
            <div>
              <FieldLabel>Redes sociais que usa</FieldLabel>
              <TagInput values={form.redes_sociais} onChange={(v) => update("redes_sociais", v)} placeholder="ex: Instagram, YouTube" readOnly={readOnly} />
            </div>
            <div>
              <FieldLabel>Pessoas e marcas que segue</FieldLabel>
              <PersonaMarcaInput
                values={form.pessoas_marcas_seguidas}
                onChange={(v) => update("pessoas_marcas_seguidas", v)}
                readOnly={readOnly}
              />
            </div>
            <div>
              <FieldLabel>Conteúdos que consome</FieldLabel>
              <ConteudoConsumidoInput
                values={form.conteudos_consumidos}
                onChange={(v) => update("conteudos_consumidos", v)}
                readOnly={readOnly}
              />
            </div>
            <div>
              <FieldLabel>Linguagem e expressões que usa</FieldLabel>
              <TagInput values={form.linguagem} onChange={(v) => update("linguagem", v)} placeholder='ex: "trabalhar em casa", "liberdade financeira"' readOnly={readOnly} />
            </div>
            <div>
              <FieldLabel>Factores de decisão de compra</FieldLabel>
              <TagInput values={form.fatores_decisao} onChange={(v) => update("fatores_decisao", v)} placeholder="ex: Prova social, Garantia" readOnly={readOnly} />
            </div>
            <div>
              <FieldLabel>Barreiras à compra</FieldLabel>
              <TagInput values={form.barreiras} onChange={(v) => update("barreiras", v)} placeholder="ex: Preço, Falta de tempo" readOnly={readOnly} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Profile card ──────────────────────────────────────────────────────────────

function ProfileCard({
  profile,
  currentPrimaryName,
  onEdit,
  onDuplicate,
  onArchive,
  onSetPrimary,
}: {
  profile: AudienceProfile;
  currentPrimaryName: string | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onSetPrimary: () => void;
}) {
  return (
    <div
      className={`rounded-lg border bg-card p-4 space-y-3 ${profile.is_archived ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm truncate">{profile.name}</h4>
            {profile.is_primary && (
              <Badge className="rounded-full border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                <Star className="mr-1 size-2.5" />
                Principal
              </Badge>
            )}
            <SectionStatusBadge status={profile.review_status as ReviewStatus} />
          </div>
          {(profile.faixa_etaria || profile.area_profissional) && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[profile.faixa_etaria, profile.area_profissional].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" onClick={onEdit} className="h-7 text-xs gap-1">
          <Pencil className="size-3" />
          Editar
        </Button>
        {!profile.is_archived && (
          <>
            <Button size="sm" variant="outline" onClick={onDuplicate} className="h-7 text-xs gap-1">
              <Copy className="size-3" />
              Duplicar
            </Button>
            {!profile.is_primary && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSetPrimary}
                className="h-7 text-xs gap-1"
              >
                <Star className="size-3" />
                Definir como Principal
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onArchive}
              className="h-7 text-xs gap-1 text-muted-foreground"
            >
              <Archive className="size-3" />
              Arquivar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StudentAudience() {
  const [profiles, setProfiles] = useState<AudienceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("todos");
  const [editingProfile, setEditingProfile] = useState<AudienceProfile | null>(null);

  // New profile dialog
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);

  // Confirm primary change dialog
  const [confirmPrimary, setConfirmPrimary] = useState<{
    profileId: string;
    studentId: string;
    currentPrimaryName: string | null;
  } | null>(null);
  const [settingPrimary, setSettingPrimary] = useState(false);

  // Confirm archive dialog
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const [duplicating, setDuplicating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const data = await getMyAudienceProfilesAction();
    setProfiles(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = profiles.filter((p) => {
    if (filter === "arquivados") return p.is_archived;
    if (p.is_archived) return false;
    if (filter === "principal") return p.is_primary;
    if (filter === "rascunho")
      return (
        p.review_status === "nao_iniciado" || p.review_status === "em_preenchimento"
      );
    return true;
  });

  const primaryProfile = profiles.find((p) => p.is_primary && !p.is_archived) ?? null;

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreatingNew(true);
    const result = await createAudienceProfileAction(newName.trim());
    setCreatingNew(false);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    setShowNewDialog(false);
    setNewName("");
    await load();
    // Abre o form do novo perfil
    const created = profiles.find((p) => p.id === (result.data as { id: string }).id);
    // Refresca e abre
    const data = await getMyAudienceProfilesAction();
    setProfiles(data);
    const newProfile = data.find((p) => p.id === (result.data as { id: string }).id);
    if (newProfile) setEditingProfile(newProfile);
  }

  async function handleDuplicate(id: string) {
    setDuplicating(id);
    const result = await duplicateAudienceProfileAction(id);
    setDuplicating(null);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Perfil duplicado");
    const data = await getMyAudienceProfilesAction();
    setProfiles(data);
  }

  async function handleConfirmSetPrimary() {
    if (!confirmPrimary) return;
    setSettingPrimary(true);
    const result = await setPrimaryAudienceProfileAction(
      confirmPrimary.profileId,
      confirmPrimary.studentId,
    );
    setSettingPrimary(false);
    if (result && "error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Perfil principal actualizado");
      setProfiles((prev) =>
        prev.map((p) => ({
          ...p,
          is_primary: p.id === confirmPrimary.profileId,
        })),
      );
    }
    setConfirmPrimary(null);
  }

  async function handleConfirmArchive() {
    if (!confirmArchive) return;
    setArchiving(true);
    const result = await archiveAudienceProfileAction(confirmArchive);
    setArchiving(false);
    if (result && "error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Perfil arquivado");
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === confirmArchive ? { ...p, is_archived: true, is_primary: false } : p,
        ),
      );
    }
    setConfirmArchive(null);
  }

  function handleSetPrimaryClick(profile: AudienceProfile) {
    if (primaryProfile && primaryProfile.id !== profile.id) {
      setConfirmPrimary({
        profileId: profile.id,
        studentId: profile.student_id,
        currentPrimaryName: primaryProfile.name,
      });
    } else {
      // Não há principal → define directamente
      setPrimaryAudienceProfileAction(profile.id, profile.student_id).then((r) => {
        if (r && "error" in r) toast.error(r.error);
        else {
          toast.success("Perfil principal definido");
          setProfiles((prev) =>
            prev.map((p) => ({ ...p, is_primary: p.id === profile.id })),
          );
        }
      });
    }
  }

  // Vista do formulário
  if (editingProfile) {
    return (
      <div className="rounded-lg border bg-card" data-section="audiencia">
        <ProfileForm
          profile={editingProfile}
          onClose={() => {
            setEditingProfile(null);
            load();
          }}
          onUpdate={(updated) => {
            setEditingProfile(updated);
            setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          }}
        />
      </div>
    );
  }

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "principal", label: "Principal" },
    { key: "rascunho", label: "Rascunho" },
    { key: "arquivados", label: "Arquivados" },
  ];

  return (
    <div className="rounded-lg border bg-card" data-section="audiencia">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h3 className="font-semibold">Perfis de Audiência</h3>
          <p className="text-xs text-muted-foreground">
            Define os teus avatares de cliente ideal
          </p>
        </div>
        <Button size="sm" onClick={() => setShowNewDialog(true)}>
          <Plus className="mr-1.5 size-3.5" />
          Novo Perfil
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-0 border-b overflow-x-auto">
        {FILTERS.map((f) => {
          const count =
            f.key === "todos"
              ? profiles.filter((p) => !p.is_archived).length
              : f.key === "arquivados"
                ? profiles.filter((p) => p.is_archived).length
                : f.key === "principal"
                  ? profiles.filter((p) => p.is_primary && !p.is_archived).length
                  : profiles.filter(
                      (p) =>
                        !p.is_archived &&
                        (p.review_status === "nao_iniciado" ||
                          p.review_status === "em_preenchimento"),
                    ).length;

          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {filter === "todos"
                ? "Ainda não tens nenhum perfil de audiência."
                : "Nenhum perfil nesta categoria."}
            </p>
            {filter === "todos" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewDialog(true)}
                className="mt-3"
              >
                Criar primeiro perfil
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                currentPrimaryName={primaryProfile?.name ?? null}
                onEdit={() => setEditingProfile(profile)}
                onDuplicate={() => handleDuplicate(profile.id)}
                onArchive={() => setConfirmArchive(profile.id)}
                onSetPrimary={() => handleSetPrimaryClick(profile)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog: Novo perfil */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Perfil de Audiência</DialogTitle>
            <DialogDescription>
              Dá um nome ao teu avatar. Podes ser específico — ex: "Maria, 35 anos, enfermeira".
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do avatar"
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creatingNew || !newName.trim()}>
              {creatingNew ? "A criar..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar principal */}
      <Dialog open={!!confirmPrimary} onOpenChange={() => setConfirmPrimary(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mudar perfil principal</DialogTitle>
            <DialogDescription>
              {confirmPrimary?.currentPrimaryName && (
                <>
                  O perfil <strong>"{confirmPrimary.currentPrimaryName}"</strong> deixará de ser
                  o principal. Continuar?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPrimary(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmSetPrimary} disabled={settingPrimary}>
              {settingPrimary ? "A definir..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar arquivo */}
      <Dialog open={!!confirmArchive} onOpenChange={() => setConfirmArchive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivar perfil</DialogTitle>
            <DialogDescription>
              Este perfil vai ser arquivado. Podes vê-lo em "Arquivados" mas não poderá ser
              seleccionado em novos lançamentos.{" "}
              <strong>Esta acção não pode ser desfeita directamente.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmArchive(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmArchive} disabled={archiving}>
              {archiving ? "A arquivar..." : "Arquivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
