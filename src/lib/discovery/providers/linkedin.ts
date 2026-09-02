import { BROWSER_UA, stripHtml } from "@/lib/discovery/providers/rss";
import type { RawJobInput } from "@/lib/discovery/discovery";

export interface LinkedInCard {
  id: string;
  title: string;
  company: string;
  location?: string;
  url: string;
  publishedAt?: string;
}

function textOf(html: string, pattern: RegExp): string | undefined {
  const m = html.match(pattern);
  if (!m) return undefined;
  const clean = stripHtml(m[1]).trim();
  return clean || undefined;
}

/**
 * Parse LinkedIn's guest job-search cards HTML into structured results.
 * Each li renders a div.base-search-card with data-entity-urn holding the
 * jobPosting id; title/company/location live in known classes.
 */
export function parseLinkedInSearchCards(html: string): LinkedInCard[] {
  const cards: LinkedInCard[] = [];
  const pattern = /data-entity-urn="urn:li:jobPosting:(\d+)"/g;
  const seen = new Set<string>();

  let m: RegExpExecArray | null;
  while ((m = pattern.exec(html))) {
    const id = m[1];
    if (seen.has(id)) continue;

    const liStart = html.lastIndexOf("<li", m.index);
    const liEndRel = html.indexOf("</li>", m.index);
    const liEnd = liEndRel === -1 ? html.length : liEndRel + 5;
    const cardHtml = html.slice(liStart === -1 ? m.index : liStart, liEnd);

    const title = textOf(cardHtml, /<h3 class="base-search-card__title">\s*([\s\S]*?)\s*<\/h3>/);
    const company = textOf(cardHtml, /<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/);
    const location = textOf(cardHtml, /<span class="job-search-card__location">([\s\S]*?)<\/span>/);
    const dt = cardHtml.match(/<time class="job-search-card__listdate" datetime="([^"]+)"/)?.[1];

    if (!title || !company) continue;
    seen.add(id);
    cards.push({
      id,
      title,
      company,
      location,
      url: `https://www.linkedin.com/jobs/view/${id}`,
      publishedAt: dt,
    });
  }

  return cards;
}

/**
 * Best-effort description extraction from a guest job-view page. LinkedIn
 * renders the description inside div.show-more-less-html__markup; text is
 * clipped to a generous window so truncation is harmless after tag stripping.
 */
export function extractLinkedInDescription(html: string): string {
  const marker = "show-more-less-html__markup";
  const idx = html.indexOf(marker);
  if (idx === -1) return "";
  const open = html.indexOf(">", idx);
  if (open === -1) return "";
  const chunk = html.slice(open + 1, open + 1 + 8000);
  return stripHtml(chunk).trim();
}

async function fetchLinkedInDescription(id: string): Promise<string | undefined> {
  const res = await fetch(`https://www.linkedin.com/jobs/view/${id}`, {
    headers: { "User-Agent": BROWSER_UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return undefined;
  const desc = extractLinkedInDescription(await res.text());
  return desc || undefined;
}

export function isLinkedInEnabled(): boolean {
  return process.env.LINKEDIN_ENABLED === "true" || process.env.LINKEDIN_ENABLED === "1";
}

export interface LinkedInFetchResult {
  jobs: RawJobInput[];
  errors: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Guest-only LinkedIn job search scraper. No credentials are (or should be)
 * used. Best-effort: rate-limiting (403/429) is expected and each failure is
 * collected per query without aborting the rest of discovery.
 * Gated behind LINKEDIN_ENABLED.
 */
export async function fetchLinkedInJobs(
  queries: string[],
  options?: { limit?: number; fetchDetails?: boolean },
): Promise<LinkedInFetchResult> {
  const jobs: RawJobInput[] = [];
  const errors: string[] = [];
  if (!isLinkedInEnabled()) return { jobs, errors };

  const limit = options?.limit ?? 15;
  const fetchDetails = options?.fetchDetails ?? process.env.LINKEDIN_FETCH_DETAILS !== "false";
  const seen = new Set<string>();

  for (const q of queries) {
    if (!q.trim()) continue;
    try {
      const url = new URL("https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search");
      url.searchParams.set("keywords", q.trim());
      url.searchParams.set("location", "");
      url.searchParams.set("f_TPR", "r2592000");
      const res = await fetch(url.toString(), {
        headers: { "User-Agent": BROWSER_UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 403 || res.status === 429) {
        errors.push(`LinkedIn (${q}): HTTP ${res.status} (rate-limited)`);
        await sleep(5000);
        continue;
      }
      if (!res.ok) {
        errors.push(`LinkedIn (${q}): HTTP ${res.status}`);
        continue;
      }

      const cards = parseLinkedInSearchCards(await res.text());
      let added = 0;
      for (const card of cards) {
        if (seen.has(card.id) || added >= limit) continue;
        seen.add(card.id);
        const description = fetchDetails
          ? await fetchLinkedInDescription(card.id).catch(() => undefined)
          : undefined;
        jobs.push({
          sourceName: "LinkedIn",
          sourceType: "DIRECT_SCRAPE" as const,
          title: card.title,
          company: card.company,
          description,
          location: card.location || undefined,
          remote: !!card.location?.toLowerCase().includes("remote"),
          sourceUrl: card.url,
          publishedAt: card.publishedAt ? new Date(card.publishedAt) : undefined,
          sourceLogoUrl: "https://www.linkedin.com/favicon.ico",
          sourceHomePageUrl: "https://www.linkedin.com",
        });
        added++;
        if (fetchDetails) await sleep(250);
      }
    } catch (e: any) {
      errors.push(`LinkedIn (${q}): ${e?.message ?? String(e)}`);
    }
    await sleep(400);
  }

  return { jobs, errors };
}