"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Heading } from "@/lib/utils/extract-headings";

interface Props {
  headings: Heading[];
}

export function TableOfContents({ headings }: Props) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const elements = headings
      .map((h) => document.getElementById(h.slug))
      .filter(Boolean) as HTMLElement[];

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSlug(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );

    elements.forEach((el) => observerRef.current!.observe(el));
    return () => observerRef.current?.disconnect();
  }, [headings]);

  return (
    <nav className="sticky top-8 space-y-1">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Neste documento
      </p>
      {headings.map((h) => (
        <button
          key={h.slug}
          onClick={() => {
            document.getElementById(h.slug)?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }}
          className={cn(
            "block w-full border-l-2 py-0.5 pl-3 text-left text-sm transition-colors",
            h.level === 3 && "pl-6",
            activeSlug === h.slug
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="line-clamp-2">{h.text}</span>
        </button>
      ))}
    </nav>
  );
}
