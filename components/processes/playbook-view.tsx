"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { SmartLink } from "@/components/processes/SmartLink";

interface Props {
  content: string;
  version: string | null;
  lastReviewedAt: string | null;
}

function splitIntoSections(markdown: string): { title: string; content: string }[] {
  const lines = markdown.split("\n");
  const sections: { title: string; content: string }[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      if (currentLines.length > 0 || currentTitle) {
        sections.push({
          title: currentTitle || "Introdução",
          content: currentLines.join("\n").trim(),
        });
      }
      currentTitle = h2[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentTitle || currentLines.length > 0) {
    sections.push({
      title: currentTitle || "Conteúdo",
      content: currentLines.join("\n").trim(),
    });
  }

  return sections.filter((s) => s.content.length > 0);
}

export function PlaybookView({ content, version, lastReviewedAt }: Props) {
  const sections = splitIntoSections(content);
  const hasH2Sections = sections.some((s) => !["Introdução", "Conteúdo"].includes(s.title));

  if (!hasH2Sections) {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => (
              <SmartLink href={href ?? ""}>{children}</SmartLink>
            ),
            p: ({ children }) => {
              const hasBlockChild = React.Children.toArray(children).some(
                (child) => typeof child !== "string" && typeof child !== "number" && typeof child !== "boolean"
              );
              return hasBlockChild ? <div className="my-2">{children}</div> : <p className="my-2">{children}</p>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(version || lastReviewedAt) && (
        <div className="flex items-center gap-2 flex-wrap">
          {version && (
            <Badge variant="outline" className="text-xs">
              {version}
            </Badge>
          )}
          {lastReviewedAt && (
            <span className="text-xs text-muted-foreground">
              última revisão{" "}
              {formatDistanceToNow(new Date(lastReviewedAt), {
                addSuffix: true,
                locale: pt,
              })}
            </span>
          )}
        </div>
      )}

      <Accordion type="multiple" defaultValue={sections.map((_, i) => `s-${i}`)}>
        {sections.map((section, i) => (
          <AccordionItem key={i} value={`s-${i}`}>
            <AccordionTrigger className="text-sm font-medium">
              {section.title}
            </AccordionTrigger>
            <AccordionContent>
              <div className="prose prose-sm max-w-none dark:prose-invert pt-2">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => (
                      <SmartLink href={href ?? ""}>{children}</SmartLink>
                    ),
                  }}
                >
                  {section.content}
                </ReactMarkdown>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
