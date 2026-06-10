"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MentorshipForm } from "./mentorship-form";

export function MentorshipCreateButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Nova Mentoria
      </Button>
      <MentorshipForm open={open} onOpenChange={setOpen} />
    </>
  );
}
