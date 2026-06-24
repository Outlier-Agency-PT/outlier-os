"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InitiativeForm } from "./initiative-form";
import type { InitiativeInput } from "@/lib/actions/initiatives";

interface Props {
  initiative: { id: string } & Partial<InitiativeInput>;
  members: { id: string; full_name: string }[];
  clients: { id: string; name: string }[];
  mentorships: { id: string; name: string }[];
}

export function InitiativeEditButton({ initiative, members, clients, mentorships }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" />
        Editar
      </Button>
      <InitiativeForm
        open={open}
        onOpenChange={setOpen}
        members={members}
        clients={clients}
        mentorships={mentorships}
        existing={initiative}
      />
    </>
  );
}
