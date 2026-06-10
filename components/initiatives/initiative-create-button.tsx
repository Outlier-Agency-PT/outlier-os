"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InitiativeForm } from "./initiative-form";

interface Props {
  members: { id: string; full_name: string }[];
  clients: { id: string; name: string }[];
  mentorships: { id: string; name: string }[];
}

export function InitiativeCreateButton({ members, clients, mentorships }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Nova Iniciativa
      </Button>
      <InitiativeForm
        open={open}
        onOpenChange={setOpen}
        members={members}
        clients={clients}
        mentorships={mentorships}
      />
    </>
  );
}
