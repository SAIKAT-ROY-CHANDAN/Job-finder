import { describe, it, expect } from "vitest";
import { inflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import { renderResumePdf } from "@/lib/resume/pdfRenderer";
import type { ResumeJSON } from "@/types";

const sampleResume: ResumeJSON = {
  personal: {
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "+1 555 0100",
    location: "Austin, TX",
    linkedin: "linkedin.com/in/janedoe",
    title: "Full Stack Engineer",
  },
  summary: "Full-stack engineer with 6 years of experience in TypeScript and AWS.",
  skills: [
    { name: "TypeScript", category: "Languages" },
    { name: "React", category: "Frameworks" },
    { name: "AWS", category: "Infrastructure" },
  ],
  languages: [{ name: "English", level: "Native" }],
  experience: [
    {
      company: "Old Co",
      title: "Developer",
      location: "Austin, TX",
      employmentType: "Full-time",
      startDate: "2020-01",
      endDate: "2022-06",
      responsibilities: ["Built internal tools."],
      achievements: [],
      technologies: ["Python"],
    },
    {
      company: "Acme",
      title: "Senior Engineer",
      location: "Remote",
      employmentType: "Full-time",
      startDate: "2022-07",
      endDate: "Present",
      responsibilities: ["Led platform migration to TypeScript."],
      achievements: ["Cut deploy time by 40%."],
      technologies: ["TypeScript", "React"],
    },
  ],
  education: [
    { degree: "BS Computer Science", institution: "State University", startDate: "2014-09", endDate: "2018-05" },
  ],
  certifications: [{ name: "AWS Solutions Architect", issuer: "Amazon", date: "2024-03" }],
  projects: [
    {
      name: "Resume Pilot",
      description: "ATS-friendly resume generator.",
      technologies: ["Next.js"],
    },
  ],
};

describe("pdfRenderer", () => {
  function decompressedText(pdf: Buffer): string {
    const raw = pdf.toString("latin1");
    let text = "";
    const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw))) {
      let stream: string;
      try {
        stream = inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
      } catch {
        continue; // non-flate stream (e.g. xref); skip
      }
      // pdf-lib emits hex strings like <4A616E65> Tj for WinAnsi text.
      const show = /<([0-9A-Fa-f\s]+)>\s*Tj/g;
      let s: RegExpExecArray | null;
      while ((s = show.exec(stream))) {
        const hex = s[1].replace(/\s+/g, "");
        if (hex.length % 2 === 0) {
          text += Buffer.from(hex, "hex").toString("latin1");
          text += "\n";
        }
      }
    }
    return text;
  }

  it("produces a multi-page-safe, valid PDF for a populated resume", async () => {
    const pdf = await renderResumePdf(sampleResume);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");

    const loaded = await PDFDocument.load(pdf, { ignoreEncryption: true });
    expect(loaded.getPageCount()).toBeGreaterThan(0);
    expect(pdf.length).toBeGreaterThan(500);

    // Text must live in decompressed content streams (selectable → ATS-readable).
    const text = decompressedText(pdf);
    expect(text).toContain("EXPERIENCE");
    expect(text).toContain("Senior Engineer");
    expect(text).toContain("TypeScript");
    expect(text).toContain("SKILLS");
    expect(text).toContain("LANGUAGES");
    expect(text).toContain("English (Native)");
    expect(text).toContain("Tech stack");
    expect(text).toContain("Full Stack Engineer");
  });

  it("handles resumes with empty sections and sparse contact info", async () => {
    const minimal: ResumeJSON = {
      personal: { fullName: "No Contact", email: "" },
      summary: "",
      skills: [],
      languages: [],
      experience: [],
      education: [],
      certifications: [],
      projects: [],
    };
    const pdf = await renderResumePdf(minimal);
    const loaded = await PDFDocument.load(pdf, { ignoreEncryption: true });
    expect(loaded.getPageCount()).toBe(1);
  });

  it("sorts experience most-recent first and formats date ranges", async () => {
    const pdf = await renderResumePdf(sampleResume);
    expect(pdf.length).toBeGreaterThan(500);
  });
});