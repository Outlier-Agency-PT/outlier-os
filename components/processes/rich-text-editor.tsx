"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState } from "react";
import TurndownService from "turndown";
import { marked } from "marked";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Strikethrough, Heading2, Heading3,
  List, ListOrdered, Code, Undo, Redo,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  docType?: string;
  templateTarget?: string;
}

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

export function RichTextEditor({ value, onChange, placeholder, docType, templateTarget }: Props) {
  const [preview, setPreview] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder ?? "Escreve aqui...",
      }),
    ],
    content: value ? marked(value) as string : "",
    onUpdate({ editor }) {
      const html = editor.getHTML();
      const markdown = turndown.turndown(html);
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[200px] w-full rounded-b-md border-x border-b border-input",
          "bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-visible:outline-none",
          "prose prose-sm max-w-none dark:prose-invert"
        ),
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = turndown.turndown(editor.getHTML());
    if (current !== value) {
      editor.commands.setContent(value ? marked(value) as string : "");
    }
  }, [value, editor]);

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded p-1.5 hover:bg-muted transition-colors",
        active ? "bg-muted text-foreground" : "text-muted-foreground"
      )}
    >
      {children}
    </button>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">Conteúdo</span>
        <div className="flex rounded-md border overflow-hidden">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={cn(
              "px-3 py-1 text-xs transition-colors",
              !preview
                ? "bg-foreground text-background"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={cn(
              "px-3 py-1 text-xs transition-colors",
              preview
                ? "bg-foreground text-background"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Pré-visualizar
          </button>
        </div>
      </div>

      {!preview && (
        <>
          <div className="flex flex-wrap items-center gap-0.5 rounded-t-md border border-input bg-muted/40 px-1.5 py-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
            >
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
            >
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive("strike")}
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="mx-1 h-4 w-px bg-border" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive("heading", { level: 2 })}
            >
              <Heading2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive("heading", { level: 3 })}
            >
              <Heading3 className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="mx-1 h-4 w-px bg-border" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
            >
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive("code")}
            >
              <Code className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="mx-1 h-4 w-px bg-border" />

            <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>
              <Undo className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>
              <Redo className="h-3.5 w-3.5" />
            </ToolbarButton>
          </div>

          <EditorContent editor={editor} />
        </>
      )}

      {preview && (
        <div className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2">
          {value ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem conteúdo para pré-visualizar.</p>
          )}
        </div>
      )}

      {docType && (
        <p className="text-xs text-muted-foreground mt-1.5">
          {docType === "playbook" &&
            "💡 Use H2 para criar secções colapsáveis — cada título vira uma secção independente."}
          {docType === "checklist" &&
            "💡 Use a lista com pontos (•) para criar os itens do checklist."}
          {(docType === "guia" || docType === "processo") &&
            "💡 Use H2 e H3 para gerar o sumário automático de navegação."}
          {docType === "template" && templateTarget === "tarefas" &&
            "💡 Use a lista com pontos (•) na barra ou escreva - item em cada linha. Cada item vira uma tarefa."}
        </p>
      )}
    </div>
  );
}
