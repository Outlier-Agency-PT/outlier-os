import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { MediaEmbed } from "./MediaEmbed";

interface Props {
  href: string;
  children?: React.ReactNode;
  className?: string;
}

const VIDEO_RE = /\.(mp4|webm|mov)$/i;

function plainExternal(href: string, children: React.ReactNode, className?: string) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <ExternalLink className="inline ml-0.5 size-3 align-baseline" />
    </a>
  );
}

export function SmartLink({ href, children, className }: Props) {
  const title = typeof children === "string" ? children : undefined;

  // 1. Video file
  if (VIDEO_RE.test(href)) {
    return <MediaEmbed src={href} type="video" title={title} />;
  }

  // 2. Loom share
  if (href.includes("loom.com/share")) {
    return <MediaEmbed src={href} type="loom" title={title} />;
  }

  // 3. Google Drive file
  if (href.includes("drive.google.com/file/d/")) {
    return <MediaEmbed src={href} type="drive-file" title={title} />;
  }

  // 4. Google Docs / Sheets / Slides
  if (
    href.includes("docs.google.com/document") ||
    href.includes("docs.google.com/spreadsheets") ||
    href.includes("docs.google.com/presentation")
  ) {
    return <MediaEmbed src={href} type="drive-doc" title={title} />;
  }

  // 5. Internal route
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  // 6. External link
  return plainExternal(href, children, className);
}
