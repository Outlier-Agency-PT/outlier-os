"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function parseItems(markdown: string): string[] {
  return markdown
    .split("\n")
    .filter((line) => /^[-*]\s+.+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim());
}

interface Props {
  value: string;
  onChange: (markdown: string) => void;
}

export function ChecklistItemsEditor({ value, onChange }: Props) {
  const [items, setItems] = useState<string[]>(() => parseItems(value));
  const [newItem, setNewItem] = useState("");

  function commit(next: string[]) {
    setItems(next);
    onChange(next.map((i) => "- " + i).join("\n"));
  }

  function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    commit([...items, trimmed]);
    setNewItem("");
  }

  function removeItem(index: number) {
    commit(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Adicionar item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button type="button" onClick={addItem} variant="outline">
          Adicionar
        </Button>
      </div>

      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <span className="flex-1">{item}</span>
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <p className="text-xs text-muted-foreground">{items.length} itens</p>
      )}
    </div>
  );
}
