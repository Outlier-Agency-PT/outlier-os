"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TeamTable } from "./team-table";
import { InviteMemberDialog } from "./invite-member-dialog";
import type { TeamMember } from "@/lib/types";

interface Props {
  members: TeamMember[];
  isAdmin: boolean;
}

export function TeamPageClient({ members, isAdmin }: Props) {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b px-8 py-4">
        <p className="text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? "membro" : "membros"}
          {" · "}
          {members.filter((m) => m.role === "admin").length} admin
        </p>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <Plus />
            Convidar Membro
          </Button>
        )}
      </div>

      <div className="space-y-4 p-8">
        {!isAdmin && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              Não és administrador. Vês a lista mas não podes editar membros.
            </CardContent>
          </Card>
        )}
        <TeamTable members={members} isAdmin={isAdmin} />
      </div>

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
}
