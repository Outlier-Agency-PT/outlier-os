"use client";

import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/lib/types/review-status";
import { REVIEW_STATUS_META } from "@/lib/types/review-status";

interface SectionStatusBadgeProps {
  status: ReviewStatus;
  className?: string;
}

/**
 * Badge de estado de revisão reutilizável. Usa as mesmas classes de cor
 * do design system (border + bg + text, com variantes dark).
 */
export function SectionStatusBadge({ status, className }: SectionStatusBadgeProps) {
  const meta = REVIEW_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-px text-[10px] font-medium tracking-wide",
        meta.classes,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
