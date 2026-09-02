import { PDFDocument, PDFFont, StandardFonts, rgb, PDFPage } from "pdf-lib";
import type { ResumeJSON } from "@/types";

/**
 * ATS-friendly, industry-standard resume renderer.
 *
 * Layout mirrors widely-used career resumes:
 * - Header: name, headline (title | top tech), contact line.
 * - Single-column, standard section headings, reverse-chronological order.
 * - Standard PDF font with real, selectable text (no images of text).
 * - Plain bullets and consistent, machine-readable date ranges.
 * - US Letter page, conservative margins.
 */

const FONT_SIZE = 10;
const DATE_SIZE = 9;
const HEADING_SIZE = 11;
const NAME_SIZE = 20;
const MARGIN = 48;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_GAP = 3.5;
const BULLET = "\u2022";

const NAVY = rgb(0.1, 0.2, 0.6);
const GRAY = rgb(0.4, 0.4, 0.4);
const BLACK = rgb(0.05, 0.05, 0.05);
const BLUE = rgb(0.15, 0.35, 0.8);

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Normalize a wide range of date inputs into a terse "Mon yyyy" label. */
function formatDateLabel(value?: string | null): string {
  if (!value) return "";
  const v = String(value).trim();
  if (!v) return "";
  if (/^(present|current)$/i.test(v)) return "Present";

  const isoYm = v.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (isoYm) {
    const m = parseInt(isoYm[2], 10);
    if (m >= 1 && m <= 12) return `${MONTHS[m - 1]} ${isoYm[1]}`;
    return isoYm[1];
  }
  if (/^\d{4}$/.test(v)) return v;
  const named = v.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (named) return `${named[1].slice(0, 3)} ${named[2]}`;

  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) {
    return `${MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`;
  }
  return v;
}

function dateRange(start?: string, end?: string): string {
  return `${formatDateLabel(start) || "N/A"} \u2013 ${formatDateLabel(end) || "Present"}`;
}

/** Chronological rank so "Present" sorts first; newer → higher. */
function dateRank(value?: string): number {
  if (!value) return -Infinity;
  if (/^(present|current)$/i.test(value.trim())) return Infinity;
  const cleaned = formatDateLabel(value);
  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  const year = cleaned.match(/\d{4}/);
  return year ? parseInt(year[0], 10) * 1e9 : -Infinity;
}

function sortByRecency<T extends { startDate?: string; endDate?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => dateRank(b.endDate) - dateRank(a.endDate));
}

export async function renderResumePdf(resume: ResumeJSON): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const lineHeight = (size: number) => size + LINE_GAP;

  const ensureSpace = (needed: number) => {
    if (y < MARGIN + needed) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawText = (text: string, size: number, bold: boolean, color = BLACK) => {
    const f = bold ? fontBold : font;
    const wrapped = wrapText(text, f, size, MAX_WIDTH);
    ensureSpace(wrapped.length * lineHeight(size));
    for (const line of wrapped) {
      page.drawText(line, { x: MARGIN, y, size, font: f, color });
      y -= lineHeight(size);
    }
  };

  const drawRightText = (text: string, size: number, color = GRAY) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: PAGE_WIDTH - MARGIN - w, y, size, font, color });
  };

  const drawBulletRow = (text: string, color = BLACK) => {
    const prefix = `${BULLET}  `;
    const prefixWidth = font.widthOfTextAtSize(prefix, FONT_SIZE);
    const wrapped = wrapText(text, font, FONT_SIZE, MAX_WIDTH - prefixWidth);
    ensureSpace(wrapped.length * lineHeight(FONT_SIZE));
    for (let i = 0; i < wrapped.length; i++) {
      const line = wrapped[i];
      page.drawText(
        i === 0 ? prefix : "",
        { x: MARGIN, y, size: FONT_SIZE, font, color: NAVY },
      );
      page.drawText(line, { x: MARGIN + prefixWidth, y, size: FONT_SIZE, font, color });
      y -= lineHeight(FONT_SIZE);
    }
  };

  const drawHeading = (text: string) => {
    ensureSpace(30);
    y -= 8;
    page.drawText(text, { x: MARGIN, y, size: HEADING_SIZE, font: fontBold, color: NAVY });
    y -= 4;
    y -= lineHeight(HEADING_SIZE);
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.8,
      color: rgb(0.78, 0.82, 0.88),
    });
    y -= 8;
  };

  const { personal } = resume;

  // --- Header ----------------------------------------------------------------
  drawText(personal.fullName || "Your Name", NAME_SIZE, true, NAVY);

  const title = (personal as { title?: string }).title;
  const recent = sortByRecency(resume.experience)[0];
  const recentTech: string[] =
    typeof recent !== "undefined"
      ? (recent.technologies ?? [])
      : [];
  const seenTech: string[] = [];
  for (const t of [...recentTech, ...resume.skills.map((s) => s.name)]) {
    if (!seenTech.includes(t)) seenTech.push(t);
    if (seenTech.length >= 5) break;
  }
  const techPart = seenTech.join(" \u00b7 ");
  const headline = [title, techPart].filter(Boolean).join(" | ");
  if (headline) {
    drawText(headline, 11.5, true, NAVY);
  }

  const contact = [
    personal.location,
    personal.phone,
    personal.email,
    personal.linkedin,
    personal.github,
    personal.portfolio,
    (personal as { website?: string }).website,
  ]
    .filter(Boolean)
    .join("  |  ");
  if (contact) drawText(contact, DATE_SIZE, false, GRAY);
  y -= 6;

  // --- Summary ------------------------------------------------------------
  if (resume.summary) {
    drawHeading("SUMMARY");
    drawText(resume.summary, FONT_SIZE, false);
  }

  // --- Experience ---------------------------------------------------------
  const experience = sortByRecency(resume.experience);
  if (experience.length) {
    drawHeading("EXPERIENCE");
    for (const e of experience) {
      const titleLine = e.title
        ? `${e.title}${e.company ? ` \u2014 ${e.company}` : ""}`
        : e.company;
      const dates = e.startDate || e.endDate ? dateRange(e.startDate, e.endDate) : "";
      ensureSpace(24 + (dates ? lineHeight(DATE_SIZE) : 0));
      const wrapped = wrapText(titleLine, fontBold, FONT_SIZE, MAX_WIDTH - 110);
      page.drawText(wrapped[0], { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: BLACK });
      if (dates) drawRightText(dates, DATE_SIZE, GRAY);
      y -= lineHeight(FONT_SIZE);
      for (const line of wrapped.slice(1)) {
        page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: BLACK });
        y -= lineHeight(FONT_SIZE);
      }

      const meta = [e.location, e.employmentType].filter(Boolean).join(" \u00b7 ");
      if (meta) {
        drawText(meta, DATE_SIZE, false, GRAY);
      }

      const bullets = [
        ...(e.responsibilities ?? []),
        ...(e.achievements ?? []),
      ].filter(Boolean);
      for (const b of bullets) drawBulletRow(b);

      const tech = (e.technologies ?? []).filter(Boolean);
      if (tech.length) {
        drawText(`Tech stack: ${tech.join(", ")}`, DATE_SIZE, false, GRAY);
      }
      y -= 4;
    }
  }

  // --- Projects -----------------------------------------------------------
  if (resume.projects.length) {
    drawHeading("PROJECTS");
    for (const p of resume.projects) {
      const tech = p.technologies.length ? ` \u2014 ${p.technologies.join(" \u00b7 ")}` : "";
      drawText(`${p.name}${tech}`, FONT_SIZE, true);
      if (p.description) drawBulletRow(p.description);
      if (p.url) drawText(p.url, DATE_SIZE, false, BLUE);
      y -= 4;
    }
  }

  // --- Education -------------------------------------------------------------
  const education = sortByRecency(resume.education);
  if (education.length) {
    drawHeading("EDUCATION");
    for (const e of education) {
      const line = e.degree
        ? `${e.degree}${e.institution ? ` \u2014 ${e.institution}` : ""}`
        : e.institution;
      const dates = e.startDate || e.endDate ? dateRange(e.startDate, e.endDate) : "";
      const wrapped = wrapText(line, fontBold, FONT_SIZE, MAX_WIDTH - 110);
      page.drawText(wrapped[0], { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: BLACK });
      if (dates) drawRightText(dates, DATE_SIZE, GRAY);
      y -= lineHeight(FONT_SIZE);
      for (const l of wrapped.slice(1)) {
        page.drawText(l, { x: MARGIN, y, size: FONT_SIZE, font, color: BLACK });
        y -= lineHeight(FONT_SIZE);
      }
      y -= 2;
    }
  }

  // --- Certifications ---------------------------------------------------------
  if (resume.certifications.length) {
    drawHeading("CERTIFICATIONS");
    for (const c of resume.certifications) {
      const suffix = c.date ? ` (${formatDateLabel(c.date)})` : "";
      const label = c.issuer ? `${c.name} \u2014 ${c.issuer}${suffix}` : `${c.name}${suffix}`;
      drawBulletRow(label);
    }
  }

  // --- Skills ----------------------------------------------------------------
  const skillNames: string[] = [];
  for (const s of resume.skills) {
    if (s.name && !skillNames.includes(s.name)) skillNames.push(s.name);
  }
  if (skillNames.length) {
    drawHeading("SKILLS");
    drawText(skillNames.join(", "), FONT_SIZE, false);
  }

  // --- Languages ---------------------------------------------------------------
  const languages = (resume.languages ?? [])
    .filter((l) => l.name)
    .map((l) => (l.level ? `${l.name} (${l.level})` : l.name));
  if (languages.length) {
    drawHeading("LANGUAGES");
    drawText(languages.join("  \u00b7  "), FONT_SIZE, false);
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}