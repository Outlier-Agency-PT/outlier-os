import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface AvatarDisplayProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarDisplay({ name, size = "md", className }: AvatarDisplayProps) {
  const sizeClass = size === "sm" ? "size-6" : size === "lg" ? "size-10" : "size-8";
  return (
    <Avatar className={cn(sizeClass, className)}>
      <AvatarFallback className={size === "sm" ? "text-[10px]" : ""}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
