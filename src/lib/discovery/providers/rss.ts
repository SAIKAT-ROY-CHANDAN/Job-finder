import Parser from "rss-parser";
import type { RawJobInput } from "@/lib/discovery/discovery";

const parser = new Parser();

export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export interface RssFeedItem {
  title?: string;
  link?: string;
  guid?: string;
  content?: string;
  contentSnippet?: string;
  description?: string;
  isoDate?: string;
  creator?: string;
  author?: string;
  company?: string;
}

export interface RssFeed {
  title?: string;
  link?: string;
  image?: { url?: string };
  items?: Array<RssFeedItem | Record<string, unknown>>;
}

/**
 * Strip HTML-ish markup so description text can be tokenized for relevance.
 */
export function stripHtml(text?: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Best-effort company extraction: explicit <company> tag (RemoteOK style),
 * then author/creator, then " ... at Company" in the item title, then the
 * feed's host as a last resort.
 */
export function deriveRssCompany(item: RssFeedItem, sourceName: string): string {
  const company = item.company?.trim();
  if (company) return company;

  const creator = (item.creator ?? item.author)?.trim();
  if (creator) return creator;

  const at = typeof item.title === "string" ? item.title.match(/\bat\s+(.+?)$/i) : null;
  if (at && at[1]) return at[1].replace(/[.,;-]+$/, "").trim();

  const colon = typeof item.title === "string" ? item.title.split(/\s*:\s*/) : null;
  if (colon && colon.length > 1 && colon[0].trim().length <= 40) return colon[0].trim();

  try {
    const host = new URL(sourceName).hostname.replace(/^www\./, "");
    if (host) return host;
  } catch {
    // sourceName isn't a URL; fall through
  }
  return sourceName;
}

function normalizeFeedHost(feedUrl: string): string {
  try {
    return new URL(feedUrl).hostname.replace(/^www\./, "");
  } catch {
    return feedUrl;
  }
}

function niceSourceName(feed: RssFeed, feedUrl: string): string {
  const title = feed.title?.trim();
  if (title && title.length <= 45) return title;
  return normalizeFeedHost(feedUrl);
}

export function normalizeRssFeed(feed: RssFeed, feedUrl: string): RawJobInput[] {
  const sourceName = niceSourceName(feed, feedUrl);
  const homePageUrl = feed.link?.trim() || feedUrl;
  const logoUrl = feed.image?.url;

  const items = (feed.items ?? []).map((i) => i as RssFeedItem);
  return items
    .filter((item) => item && !!(item.title && item.link))
    .map((item) => {
      const cleaned =
        item.contentSnippet?.trim() ||
        stripHtml(item.content ?? item.description) ||
        undefined;
      const publishedAt = item.isoDate ? new Date(item.isoDate) : undefined;
      return {
        sourceName,
        sourceType: "RSS_FEED" as const,
        title: item.title!.trim(),
        company: deriveRssCompany(item, sourceName),
        description: cleaned,
        location: "Remote",
        remote: true,
        sourceUrl: item.link!.trim(),
        publishedAt,
        sourceLogoUrl: logoUrl,
        sourceHomePageUrl: homePageUrl,
        sourceFeedUrl: feedUrl,
      } satisfies RawJobInput;
    });
}

export interface RssFetchResult {
  jobs: RawJobInput[];
  fetched: number;
  errors: string[];
}

/**
 * Fetch and normalize a list of RSS feed URLs. Errors are collected per feed
 * so one failing feed never aborts discovery for the others.
 */
export async function fetchRssFeeds(feedUrls: string[]): Promise<RssFetchResult> {
  const jobs: RawJobInput[] = [];
  const errors: string[] = [];
  let fetched = 0;

  for (const feedUrl of feedUrls) {
    const url = feedUrl.trim();
    if (!url) continue;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": BROWSER_UA, Accept: "application/xml, application/rss+xml, */*" },
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        errors.push(`RSS ${url}: HTTP ${res.status}`);
        continue;
      }
      const xml = await res.text();
      const feed = await parser.parseString(xml);
      const normalized = normalizeRssFeed(feed as unknown as RssFeed, url);
      fetched += normalized.length;
      jobs.push(...normalized);
    } catch (e: any) {
      errors.push(`RSS ${url}: ${e?.message ?? String(e)}`);
    }
  }

  return { jobs, fetched, errors };
}