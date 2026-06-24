import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex w-full items-start justify-between gap-4 overflow-hidden border-b px-4 py-5 md:px-8", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[22px] font-bold leading-none tracking-[-0.03em] md:text-[30px]">
          {title}
        </h1>
        {description &&
          (typeof description === "string" ? (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          ) : (
            <div className="mt-1.5">{description}</div>
          ))}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
