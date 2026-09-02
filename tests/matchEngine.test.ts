import { describe, it, expect } from "vitest";
import { computeMatchScore } from "@/lib/matching/matchEngine";
import type { MasterProfile } from "@/types";

const baseProfile: MasterProfile = {
  id: "p1",
  userId: "u1",
  fullName: "Test User",
  email: "test@example.com",
  yearsOfExperience: 5,
  preferredTitles: ["Full Stack Developer", "Full Stack Engineer"],
  preferredTech: ["React", "Node.js", "PostgreSQL", "TypeScript"],
  preferredIndustries: ["Technology"],
  preferredLocations: ["Bangladesh"],
  workPreference: "REMOTE",
  languages: ["English"],
  skills: [
    { name: "React", category: "FRONTEND" },
    { name: "Node.js", category: "BACKEND" },
    { name: "PostgreSQL", category: "DATABASE" },
    { name: "TypeScript", category: "FRONTEND" },
  ],
  experiences: [],
  education: [{ degree: "BSc", institution: "University" }],
  certifications: [],
  projects: [],
};

const job = {
  title: "Full Stack Developer",
  requiredTech: ["React", "Node.js", "PostgreSQL"],
  preferredTech: ["TypeScript"],
  minimumYears: 3,
  location: "Remote",
  remote: true,
  industry: "Technology",
};

describe("computeMatchScore", () => {
  it("returns a high match score when all tech matches", () => {
    const result = computeMatchScore(baseProfile, job);
    expect(result.matchScore).toBeGreaterThanOrEqual(80);
    expect(result.requiredMissing).toEqual([]);
    expect(result.matchedSkills).toContain("React");
  });

  it("flags missing required technologies", () => {
    const jobMissing = { ...job, requiredTech: ["React", "Docker"] };
    const result = computeMatchScore(baseProfile, jobMissing);
    expect(result.requiredMissing).toContain("Docker");
    expect(result.matchedSkills).toContain("React");
  });

  it("scores a remote job at full location fit when remote preferred", () => {
    const result = computeMatchScore(baseProfile, job);
    expect(result.matchComponents.location).toBe(1);
  });

  it("scores within 0-100", () => {
    const result = computeMatchScore(baseProfile, job);
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);
  });
});
