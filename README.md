# JobPilot

**AI-assisted job search that finds fewer, but better jobs — and prepares high-quality, tailored applications.**

JobPilot helps a single user find legitimate jobs that closely match their professional profile, generate a customized resume for each specific job, and assist with submitting the application. It is explicitly **not** an application spam bot: the user must click **Apply** and explicitly confirm every submission.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Folder Structure](#folder-structure)
5. [Database Schema](#database-schema)
6. [API Design](#api-design)
7. [AI Architecture](#ai-architecture)
8. [Job Matching Algorithm](#job-matching-algorithm)
9. [Credibility Algorithm](#credibility-algorithm)
10. [Application Automation](#application-automation)
11. [Processing Model](#processing-model)
12. [Getting Started](#getting-started)
13. [Environment Variables](#environment-variables)
14. [Testing](#testing)
15. [Phases](#phases)

---

## Features

- **Master Profile** — enter professional details once; stored permanently.
- **Resume Builder** — generate a master resume, plus a tailored resume per job.
- **PDF Generation** — structured resume JSON → clean PDF via `pdf-lib` (AI never controls layout).
- **Job Matching** — deterministic 0–100 match score with per-factor reasons.
- **Credibility Scoring** — separate 0–100 score that assesses job legitimacy.
- **Job Dashboard** — card-based UI with match/credibility/salary/tech; filtered search.
- **Application Flow** — prepare → review → explicit confirm → submit.
- **Application Tracker** — status lifecycle with the exact resume used.
- **AI (OpenRouter)** — job analysis, resume tailoring, cover letters, question answering.
- **Playwright automation** — modular providers (Greenhouse + generic), with human-takeover safeguards.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) + TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Forms | React Hook Form + Zod |
| Database | PostgreSQL + Prisma ORM |
| AI | OpenRouter (configurable model) |
| Browser automation | Playwright |
| Auth | NextAuth.js (credentials) |
| PDF | pdf-lib |
| Tests | Vitest |

---

## Architecture

```
User Master Profile
      │
      ▼
Job sources (Google Jobs / RSS / API / direct scrape)
      │  normalize + dedupe
      ▼
Job database (PostgreSQL)
      │
      ▼
AI analysis + deterministic matching + credibility
      │
      ▼
Job dashboard (match %, credibility, salary, tech)
      │
      ▼  user clicks Apply
Job-specific resume + cover letter + answers  (application package)
      │
      ▼  user reviews + confirms
Application → tracker (idempotent, no duplicates)
```

The application is deployed as a Next.js app; a separate Playwright automation layer runs
browser flows modularly.

---

## Folder Structure

```
job_finder/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # REST API routes
│   │   ├── dashboard/         # Dashboard page
│   │   ├── jobs/              # Job list + detail + apply
│   │   ├── applications/      # Application tracker
│   │   ├── profile/           # Master Profile builder
│   │   ├── resume/            # Resume generator
│   │   ├── settings/          # Settings
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── auth/              # Login/Register forms
│   │   ├── dashboard/         # Dashboard widgets
│   │   ├── jobs/              # Job cards, filters, apply
│   │   ├── applications/      # Tracker list
│   │   ├── profile/           # Profile form
│   │   └── resume/            # Resume manager
│   ├── lib/
│   │   ├── ai/                # OpenRouter service
│   │   ├── matching/          # matchEngine, credibilityEngine
│   │   ├── resume/            # resumeBuilder, pdfRenderer
│   │   ├── discovery/         # job ingestion/dedup
│   │   ├── db.ts              # Prisma client
│   │   ├── auth.ts            # NextAuth config
│   │   ├── env.ts             # env validation
│   │   ├── job-service.ts     # ingest/analyze/match
│   │   ├── profile-service.ts # profile CRUD
│   │   ├── application-service.ts # prepare/submit
│   │   └── server-helpers.ts  # auth + profile helpers
│   ├── automation/            # Playwright automation
│   │   ├── provider.ts        # ApplicationProvider interface
│   │   ├── fieldMapper.ts     # semantic field mapping
│   │   ├── applicationRunner.ts
│   │   └── providers/         # greenhouse, careerPage, index
│   └── types/                 # shared types
├── tests/                     # Vitest unit tests
├── requirement.md             # product spec
├── package.json
└── .env.example
```

---

## Database Schema

Models (Prisma, PostgreSQL): `User`, `Session`, `Profile`, `Experience`, `Skill`,
`Education`, `Certification`, `Project`, `Company`, `JobSource`, `Job`,
`JobRequirement`, `JobMatch`, `Resume`, `ResumeVersion`, `CoverLetter`,
`Application`, `ApplicationAnswer`, `ApplicationEvent`.

Key design decisions:
- `Profile` is 1:1 with `User`; experience/skills/education/etc. are owned by `User`.
- `JobMatch` has a unique `(jobId, profileId)` to keep matching idempotent.
- `Application` has a unique `(userId, jobId)` so retries never create duplicates.
- Enums: `SkillCategory`, `WorkPreference`, `JobStatus`, `JobSourceType`,
  `ApplicationStatus`, `ApplicationEventType`.

---

## API Design

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/register` | Create account + profile shell |
| POST/GET | `/api/auth/[...nextauth]` | NextAuth |
| GET/PUT | `/api/profile` | Read / update master profile |
| POST | `/api/profile/experience` | Add experience |
| POST | `/api/profile/skills` | Add skill |
| POST | `/api/profile/education` | Add education |
| POST | `/api/profile/certifications` | Add certification |
| POST | `/api/profile/projects` | Add project |
| GET | `/api/jobs` | List jobs (filter/sort) |
| POST | `/api/jobs` | Ingest a raw job |
| GET | `/api/jobs/[id]` | Job detail |
| POST | `/api/jobs/[id]/match` | Run match + credibility |
| POST | `/api/jobs/[id]/apply` | Prepare application package |
| GET | `/api/applications` | List applications |
| GET | `/api/applications/[id]` | Application detail |
| POST | `/api/applications/[id]/submit` | Confirm + submit |
| POST/GET | `/api/resumes` | Generate / list resumes |
| POST | `/api/ai/analyze-job` | AI analyze job description |

---

## AI Architecture

Reusable service in `src/lib/ai/aiService.ts`:

```
aiService.generate()
aiService.analyzeJob()
aiService.matchCandidateToJob()
aiService.generateResume()
aiService.generateCoverLetter()
aiService.answerApplicationQuestion()
```

- Model is configurable via `OPENROUTER_MODEL`.
- Returns **structured JSON** (validated with Zod) for resume/matching — the AI never
  controls layout.
- **Safety rules:** the AI is instructed to use only verified profile data; for
  application questions with insufficient data it returns `"Information unavailable"`
  rather than fabricating an answer.

---

## Job Matching Algorithm

`src/lib/matching/matchEngine.ts`

- **Deterministic** weighted scoring across components: tech (0.35), experience (0.20),
  title/seniority (0.20), location/remote (0.15), education (0.05), industry (0.05).
- Tech component differentiates required vs preferred skills.
- The LLM supplies only a **semantic summary** and extra concept detection; the numeric
  score always derives from deterministic rules (the LLM never arbitrarily assigns it).

---

## Credibility Algorithm

`src/lib/matching/credibilityEngine.ts`

- A separate 0–100 score from externally observable signals: company website/domain,
  careers page, LinkedIn presence, job age, salary transparency, suspicious language,
  requests for money, requests for sensitive info, fake-recruitment indicators.
- Labels: 90–100 Highly credible, 75–89 Likely credible, 50–74 Verify carefully,
  0–49 Suspicious.
- Presented as an assessment, **not a guarantee**.

---

## Application Automation

`src/automation/`

- Modular `ApplicationProvider` interface (`canHandle`, `openApplication`,
  `detectFields`, `fillPersonalInformation`, `uploadResume`, `answerQuestions`,
  `reviewApplication`, `submitApplication`).
- Ships with `greenhouse` and a generic `careerPage` provider (registry in
  `providers/index.ts`).
- **Never bypasses** CAPTCHA, MFA, anti-bot, logins, or access controls. If human
  intervention is required, the runner returns `needs_human` and pauses.

---

## Processing Model

JobPilot runs **fully synchronously** — no Redis or separate worker process is required.
Only PostgreSQL is needed.

- Job ingestion, job analysis, matching, credibility scoring, resume generation, and
  application submission all run directly inside the API routes.
- Batch operations are idempotent (dedup by title/company; unique application
  constraints) so repeated calls never create duplicates.
- **Profile-driven job discovery:** on the Jobs page, click **"Discover jobs from my
  profile"** to fetch live remote jobs (Remotive public API), automatically filtered by
  your profile's preferred titles/tech/industries, then ingested and matched/scored
  synchronously. Unscored jobs are backfilled when you run discovery again.

---

## Getting Started

Prerequisites: Node 20+, PostgreSQL.

```bash
# 1. Install dependencies
npm install

# 2. Set up env
cp .env.example .env.local   # then fill in DATABASE_URL, OPENROUTER_API_KEY, NEXTAUTH_SECRET

# 3. Generate Prisma client + push schema
npm run prisma:generate
npm run prisma:push

# 4. Run dev server
npm run dev                  # http://localhost:3000
```

## Environment Variables

See `.env.example`:

```
DATABASE_URL=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
PLAYWRIGHT_ENABLED=
```

`.env*` files are git-ignored.

---

## Testing

```bash
npm test          # vitest run
npm run typecheck # tsc --noEmit
npm run lint      # next lint
```

Unit tests cover the matching and credibility scoring engines.

---

## Phases

- **MVP:** Auth, Master Profile, Resume builder + PDF, Job database, matching,
  credibility, job dashboard, application tracker — *implemented*.
- **Phase 2:** OpenRouter job-specific resume, cover letters, question generation — *implemented*.
- **Phase 3:** Playwright application providers + human approval — *implemented (modular base)*.
- **Phase 4:** Recruiter outreach, analytics, more job sources/providers — *next*.

---

## License

MIT
