import { z } from "zod";
import { env } from "@/lib/env";
import type { JobMatchResult, ResumeJSON } from "@/types";// Reusable AI service backed by OpenRouter.
// The model is configurable via OPENROUTER_MODEL env variable.

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

const fallbackModel = "meta-llama/llama-3.1-8b-instruct";

export class AIService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = env.OPENROUTER_API_KEY || "";
    this.model = env.OPENROUTER_MODEL || fallbackModel;
    this.baseUrl = env.OPENROUTER_BASE_URL;
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      h["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return h;
  }

  private async chat(messages: ChatMessage[], options: ChatOptions = {}) {
    if (!this.apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 2048,
    };
    if (options.jsonMode) {
      body["response_format"] = { type: "json_object" };
    }
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  private extractJson(text: string): unknown {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    // Find first { ... } block
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("No JSON object found in AI response");
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  /**
   * Generic generation helper with schema validation.
   */
  async generate<T>(
    system: string,
    user: string,
    schema: z.ZodTypeAny,
    options: ChatOptions = {},
  ): Promise<T> {
    const text = await this.chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { ...options, jsonMode: true },
    );
    const parsed = this.extractJson(text);
    return schema.parse(parsed) as T;
  }

  /**
   * Analyze a raw job posting and normalize it.
   */
  async analyzeJob(description: string): Promise<{
    title: string;
    requiredTech: string[];
    preferredTech: string[];
    minimumYears?: number;
    location?: string;
    remote: boolean;
    industry?: string;
    educationLevel?: string;
  }> {
    const schema = z.object({
      title: z.string(),
      requiredTech: z.array(z.string()).default([]),
      preferredTech: z.array(z.string()).default([]),
      minimumYears: z.number().int().optional(),
      location: z.string().optional(),
      remote: z.boolean().default(false),
      industry: z.string().optional(),
      educationLevel: z.string().optional(),
    });
    return this.generate(
      `You are a job analyzer. Extract structured information from a job description. Do not invent requirements that are not present. If location is not present, omit it. Remote should be true only if the posting explicitly indicates remote/hybrid work is possible.`,
      `Analyze the following job description:\n\n${description}`,
      schema,
    );
  }

  /**
   * Semantic matching between profile and job. Returns a structured reasoning
   * object; the numeric match score itself is computed deterministically by the
   * matching engine (see matchEngine.ts). This supplies the semantic summary.
   */
  async matchCandidateToJob(
    profileSummary: string,
    jobSummary: string,
  ): Promise<{ semanticSummary: string; matchedConcepts: string[]; missingConcepts: string[] }> {
    const schema = z.object({
      semanticSummary: z.string(),
      matchedConcepts: z.array(z.string()).default([]),
      missingConcepts: z.array(z.string()).default([]),
    });
    return this.generate(
      `You are a senior technical recruiter evaluating candidate-job fit. Compare the candidate profile against the job requirements. Describe the fit factually using ONLY the information provided. Do not invent qualifications the candidate does not have.`,
      `CANDIDATE PROFILE:\n${profileSummary}\n\nJOB REQUIREMENTS:\n${jobSummary}`,
      schema,
      { temperature: 0.2 },
    );
  }

  /**
   * Generate a job-specific resume (structured JSON) from the master profile + job.
   */
  async generateResume(
    masterProfile: string,
    jobDescription: string,
  ): Promise<ResumeJSON> {
    const schema = z.object({
      personal: z.object({
        fullName: z.string(),
        email: z.string(),
        phone: z.string().optional(),
        location: z.string().optional(),
        linkedin: z.string().optional(),
        github: z.string().optional(),
        portfolio: z.string().optional(),
        title: z.string().optional(),
      }),
      summary: z.string(),
      skills: z.array(z.object({ name: z.string(), category: z.string() })).default([]),
      languages: z.array(z.object({ name: z.string(), level: z.string().optional() })).default([]),
      experience: z.array(
        z.object({
          company: z.string(),
          title: z.string(),
          location: z.string().optional(),
          employmentType: z.string().optional(),
          startDate: z.string(),
          endDate: z.string().optional(),
          responsibilities: z.array(z.string()).default([]),
          achievements: z.array(z.string()).default([]),
          technologies: z.array(z.string()).default([]),
        }),
      ),
      education: z.array(
        z.object({
          degree: z.string(),
          institution: z.string(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }),
      ),
      certifications: z.array(
        z.object({ name: z.string(), issuer: z.string(), date: z.string().optional() }),
      ),
      projects: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          technologies: z.array(z.string()).default([]),
          url: z.string().optional(),
        }),
      ),
    });
    return this.generate(
      `You are a professional resume writer. Tailor the candidate's master profile to the specific job, producing structured resume JSON. You may reorder, rephrase, and emphasize only information that EXISTS in the master profile. You MUST NOT invent experience, employers, projects, technologies, certifications, achievements, metrics, or salary history. Use the candidate's languages exactly as listed in the profile (if the profile has none, return an empty array). For each experience, copy its location, employment type, and technologies from the profile. If a section has no data, return an empty array.`,
      `MASTER PROFILE (JSON):\n${masterProfile}\n\nTARGET JOB:\n${jobDescription}`,
      schema,
      { temperature: 0.3, maxTokens: 4000 },
    );
  }

  /**
   * Generate a cover letter from profile + job.
   */
  async generateCoverLetter(
    fullName: string,
    profileSummary: string,
    jobDescription: string,
  ): Promise<string> {
    return this.chat([
      {
        role: "system",
        content: `You are a professional cover letter writer. Write a concise, authentic cover letter (200-300 words) using only facts from the candidate's profile. Never invent achievements. Address it appropriately for the job. Do not use placeholders.`,
      },
      {
        role: "user",
        content: `Candidate name: ${fullName}\n\nProfile:\n${profileSummary}\n\nJob:\n${jobDescription}`,
      },
    ]);
  }

  /**
   * Answer an application question using only verified profile data.
   * Returns "Information unavailable" when the profile lacks the data.
   */
  async answerApplicationQuestion(
    question: string,
    profileSummary: string,
  ): Promise<string> {
    return this.chat([
      {
        role: "system",
        content: `You answer job application questions on the candidate's behalf. Use ONLY information explicitly present in the candidate profile. If the profile does not contain enough information to answer, reply with exactly: "Information unavailable". Never invent or fabricate an answer.`,
      },
      {
        role: "user",
        content: `APPLICATION QUESTION:\n${question}\n\nCANDIDATE PROFILE:\n${profileSummary}`,
      },
    ]);
  }
}

export const aiService = new AIService();
