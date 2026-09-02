"use client";

import { useState } from "react";
import type { JobSource } from "@prisma/client";

function faviconFor(source: JobSource | null): string | null {
  if (!source?.homePageUrl) return null;
  try {
    const domain = new URL(source.homePageUrl).hostname;
    if (!domain) return null;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

/**
 * Renders the source's logo on a job card, falling back to a favicon derived
 * from the source homepage and then to an initial-letter badge. Never breaks
 * layout: fixed 28px rounded box.
 */
export function SourceLogo({ source, className }: { source: JobSource | null; className?: string }) {
  const favicon = faviconFor(source);
  const [src, setSrc] = useState<string | null>(source?.logoUrl || favicon);
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold uppercase ${
          className ?? ""
        }`}
      >
        {source?.name?.charAt(0) ?? "?"}
      </div>
    );
  }

  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white ${
        className ?? ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={source?.name ?? "Source"}
        width={24}
        height={24}
        className="h-5 w-5 object-contain"
        onError={() => {
          if (favicon && src !== favicon) {
            setSrc(favicon);
          } else {
            setFailed(true);
          }
        }}
      />
    </div>
  );
}