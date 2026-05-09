import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyModuleProps {
  icon: LucideIcon;
  title: string;
  description: string;
  sprintTag?: string;
}

export function EmptyModule({ icon: Icon, title, description, sprintTag }: EmptyModuleProps) {
  return (
    <Card className="mx-auto mt-12 max-w-2xl">
      <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
        <div className="rounded-full bg-primary/10 p-4">
          <Icon className="size-10 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        {sprintTag && (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {sprintTag}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
