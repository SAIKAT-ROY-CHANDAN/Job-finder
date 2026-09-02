# Build: AI Job Search & Job-Specific Application Platform

Build a production-quality web application called **JobPilot**.

The purpose of this application is to help a user find legitimate jobs that closely match their professional profile, generate a customized resume for each specific job, and assist with submitting the application.

The application must NOT blindly mass-apply to jobs. The user must explicitly click **Apply** for each job. The system should optimize for high-quality, relevant applications.

---

## 1. Core User Flow

The complete flow should be:

1. User creates an account.
2. User enters their professional information once.
3. The system stores this as the user's **Master Profile**.
4. AI generates a professional master resume from the profile.
5. The system searches supported job sources.
6. Jobs are normalized and stored in the database.
7. AI analyzes each job against the user's Master Profile.
8. Each job receives:

   * Match Score
   * Credibility Score
   * Matching skills
   * Missing requirements
   * Reasons for the score
9. User browses recommended jobs.
10. Each job has an **Apply** button.
11. When the user clicks Apply:

    * Analyze that specific job.
    * Select relevant information from the user's Master Profile.
    * Generate a job-specific resume.
    * Generate a job-specific cover letter if required.
    * Generate answers to application questions when possible.
    * Open/automate the supported application process.
12. Before final submission, show the user exactly what will be submitted.
13. User explicitly confirms submission.
14. Submit the application.
15. Save the application and generated documents in the database.
16. Show the application in the user's Application Tracker.

---

# 2. Technology Stack

Use:

### Frontend

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui
* React Hook Form
* Zod

### Backend

Use Next.js server-side APIs or a separate Node.js/TypeScript backend where appropriate.

### Database

* PostgreSQL
* Prisma ORM

### Queue / Background Jobs

* Redis
* BullMQ

Use background workers for:

* Job collection
* Job parsing
* AI analysis
* Resume generation
* Application automation

### AI

Use **OpenRouter API**.

The model must be configurable through environment variables.

Do not hard-code a specific AI model.

Example:

OPENROUTER_API_KEY=
OPENROUTER_MODEL=

Create a reusable AI service:

aiService.generate()
aiService.analyzeJob()
aiService.matchCandidateToJob()
aiService.generateResume()
aiService.generateCoverLetter()
aiService.answerApplicationQuestion()

### Browser Automation

Use **Playwright**.

The browser automation layer must be modular because different job websites have different application flows.

---

# 3. Master Profile

Create a comprehensive profile system.

The user should be able to enter:

### Personal Information

* Full name
* Email
* Phone
* Location
* LinkedIn
* GitHub
* Portfolio
* Website

### Professional Information

* Current job title
* Years of experience
* Preferred job titles
* Preferred technologies
* Preferred industries
* Preferred locations
* Remote/hybrid/on-site preference
* Expected salary
* Availability

### Experience

For each position:

* Company
* Job title
* Location
* Employment type
* Start date
* End date
* Description
* Responsibilities
* Achievements
* Technologies

### Skills

Separate skills into:

* Frontend
* Backend
* Database
* DevOps
* Tools
* Other

### Education

* Degree
* Institution
* Start date
* End date
* Description

### Certifications

* Certification
* Issuer
* Date
* Credential URL

### Projects

For each project:

* Name
* Description
* Technologies
* URL
* GitHub URL
* Images/screenshots

IMPORTANT:

Only include projects in resumes if the user has actually provided them.

Never invent projects, URLs, employers, experience, qualifications, achievements, or technologies.

---

# 4. Resume System

Create a resume builder.

The resume generation pipeline should be:

User Master Profile
→ Job Description
→ AI Resume Selection/Tailoring
→ Structured Resume JSON
→ Resume Template
→ PDF

The AI must NOT directly control PDF layout.

The AI should return structured JSON.

Example:

{
"summary": "...",
"skills": [...],
"experience": [...],
"education": [...],
"certifications": [...],
"projects": [...]
}

The PDF renderer should control the formatting.

---

# 5. Job-Specific Resume

This is one of the most important features.

When the user clicks:

**APPLY**

the system must generate a new resume specifically for that job.

The AI should:

* Analyze the job description.
* Identify important requirements.
* Identify relevant technologies.
* Identify relevant experience.
* Select the most relevant achievements.
* Reorder skills according to relevance.
* Rewrite the professional summary for the position.
* Prioritize relevant experience.
* Include relevant projects only.
* Remove irrelevant information when appropriate.

The AI may improve wording.

The AI MUST NOT:

* Invent experience.
* Invent technologies.
* Invent employers.
* Invent projects.
* Invent certifications.
* Invent achievements.
* Invent salary history.
* Invent metrics.

Every claim in the generated resume must originate from the user's Master Profile.

---

# 6. Job Matching

Create a job matching engine.

Calculate a Match Score between 0 and 100.

Consider:

* Required technologies
* Preferred technologies
* Years of experience
* Job title
* Seniority
* Location
* Remote preference
* Education requirements
* Industry
* Other explicit requirements

Use deterministic scoring where possible and use the LLM for semantic comparison.

Example:

94% Match

Reasons:

* Next.js required
* React required
* Node.js required
* PostgreSQL experience
* REST API experience
* Production deployment experience

Missing:

* Docker

Do NOT allow the LLM to arbitrarily assign a score without structured reasoning.

---

# 7. Job Credibility

Create a separate **Credibility Score**.

This is NOT the same as Match Score.

Example:

Match:
94%

Credibility:
91/100

Evaluate signals such as:

* Company website exists
* Official company domain
* Official careers page
* Job appears on company website
* Company LinkedIn presence
* Company information consistency
* Recruiter/contact information
* Job posting age
* Application domain
* Salary transparency
* Suspicious language
* Requests for money
* Requests for sensitive information
* Fake recruitment indicators

Display:

### Credibility: 91/100

"Likely legitimate"

Possible labels:

90–100: Highly credible
75–89: Likely credible
50–74: Verify carefully
0–49: Suspicious

This score must be presented as an assessment, not a guarantee.

---

# 8. Job Dashboard

Create a modern dashboard.

Each job card should show:

---

Full Stack Developer

Company Name

Remote · Bangladesh

Match
94%

Credibility
91/100

Salary
৳40,000–৳60,000

Key technologies:
React · Next.js · Node.js · PostgreSQL

Posted:
2 days ago

[View Job] [Apply]

---

Add filters:

* Match score
* Credibility
* Remote
* Location
* Salary
* Technology
* Job title
* Date posted

---

# 9. Job Details Page

Show:

* Company
* Position
* Location
* Salary
* Job description
* Requirements
* Technologies
* Match score
* Credibility score
* Why it matches
* Missing requirements
* Company information
* Original job URL

Buttons:

[Apply]

[Save]

[Skip]

---

# 10. Application Flow

When the user clicks Apply:

STEP 1:

Analyze job.

STEP 2:

Generate customized resume.

STEP 3:

Generate cover letter if useful.

STEP 4:

Prepare application fields.

STEP 5:

If application questions exist, generate answers using only verified information from the Master Profile.

STEP 6:

Show:

### Application Ready

Resume:
Saikot-CompanyName-Full-Stack-Developer.pdf

Cover Letter:
Generated

Questions:
5/5 prepared

Fields:
14/14 completed

Then show:

**Review Application**

The user must explicitly confirm before final submission.

---

# 11. Playwright Application Automation

Create a modular automation architecture.

Example:

/automation
/providers
greenhouse.ts
lever.ts
companyCareer.ts
browser.ts
applicationRunner.ts
fieldMapper.ts

Create an interface:

ApplicationProvider

with methods such as:

* canHandle(url)
* openApplication()
* detectFields()
* fillPersonalInformation()
* uploadResume()
* answerQuestions()
* reviewApplication()
* submitApplication()

Start by supporting only a small number of application systems.

Do NOT attempt to bypass:

* CAPTCHA
* MFA
* anti-bot protection
* access controls
* login security

If human intervention is required, pause the process and ask the user to take over.

---

# 12. Application Review

Before submission, show:

Candidate information

Resume

Cover letter

Application answers

Files

Destination website

Then:

**[Submit Application]**

The system must never silently submit an application.

---

# 13. Application Tracker

Create a complete tracker.

Statuses:

* Saved
* Preparing
* Ready to Apply
* Applied
* Viewed
* Interview
* Rejected
* Offer
* Withdrawn

Show:

Company
Position
Applied Date
Match Score
Credibility
Resume Used
Status

Allow the user to open the exact generated resume used for the application.

---

# 14. AI Safety / Accuracy Rules

These rules are mandatory.

The AI must never fabricate:

* Experience
* Projects
* Companies
* Technologies
* Degrees
* Certifications
* Job titles
* Achievements
* Salary
* References

If information is missing, return:

"Information unavailable"

rather than inventing an answer.

For application questions, use only verified information from the Master Profile.

---

# 15. Email Outreach

Add optional recruiter/company outreach.

The system can generate:

* Recruiter email
* LinkedIn message
* Follow-up message

The user must approve the message before sending.

Do not automatically spam recruiters.

---

# 16. Database Models

Design Prisma models for at least:

User
Profile
Experience
Skill
Education
Certification
Project
Job
Company
JobRequirement
JobMatch
Resume
ResumeVersion
CoverLetter
Application
ApplicationAnswer
ApplicationEvent
JobSource

Use proper relations, indexes, timestamps, and enums.

---

# 17. Security

Implement:

* Authentication
* Authorization
* Secure password handling if using custom auth
* Input validation
* Zod validation
* Rate limiting
* Secure environment variables
* Encryption/protection for sensitive credentials
* Audit logs
* CSRF protection where applicable
* Server-side authorization checks

Never expose API keys to the frontend.

---

# 18. UI/UX

The UI should look like a modern SaaS application.

Use:

* Responsive layout
* Sidebar navigation
* Dashboard
* Cards
* Tables
* Search
* Filters
* Modals
* Progress indicators
* Toast notifications
* Loading states
* Error states
* Empty states

Main navigation:

Dashboard
Jobs
Applications
Resume
Profile
Settings

---

# 19. Dashboard

Show:

Total Jobs Found
High Match Jobs
Applications
Interviews
Response Rate

Also show:

### Recommended Jobs

Prioritize jobs with:

High Match + High Credibility + Recent Posting

---

# 20. Background Processing

Use BullMQ.

Queues:

job-discovery
job-analysis
job-matching
resume-generation
application-preparation
application-automation
email-outreach

Workers should be retryable and idempotent.

Never create duplicate applications because a worker was retried.

---

# 21. API Design

Create clean REST/API routes such as:

POST /api/profile

GET /api/jobs

GET /api/jobs/:id

POST /api/jobs/:id/match

POST /api/jobs/:id/apply

POST /api/resumes/generate

GET /api/applications

GET /api/applications/:id

POST /api/applications/:id/prepare

POST /api/applications/:id/submit

POST /api/ai/analyze-job

Use TypeScript types throughout.

---

# 22. Environment Variables

Create:

DATABASE_URL=
REDIS_URL=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
NEXTAUTH_SECRET=

Do not commit .env files.

Create .env.example.

---

# 23. Important Product Principle

The product is NOT an application spam bot.

Its goal is:

**Find fewer but better jobs.**

Prioritize:

1. Candidate-job fit
2. Company/job credibility
3. Recent posting
4. Appropriate seniority
5. Realistic hiring probability

The user controls the Apply action.

---

# 24. Development Approach

Do not generate the entire application as one giant file.

Build it modularly.

First implement:

### MVP

1. Authentication
2. Master Profile
3. Resume Builder
4. PDF generation
5. Job database
6. Job matching
7. Credibility scoring
8. Job dashboard
9. Application tracker

Then implement:

### Phase 2

10. OpenRouter integration
11. Job-specific resume generation
12. Cover letter generation
13. Application question generation

Then:

### Phase 3

14. Playwright
15. Application providers
16. Application preparation
17. Human approval
18. Submission

Then:

### Phase 4

19. Recruiter outreach
20. Follow-ups
21. Analytics
22. More job sources
23. More application providers

---

# 25. Code Quality Requirements

Use:

* TypeScript strict mode
* Reusable services
* Repository/service architecture where appropriate
* Proper error handling
* Zod validation
* Prisma transactions
* Typed API responses
* No `any` unless absolutely necessary
* Environment validation
* Logging
* Clear folder structure
* Unit tests for matching/scoring logic
* Integration tests for application workflows

Before writing code, provide:

1. Architecture
2. Folder structure
3. Database schema
4. API design
5. AI architecture
6. Job matching algorithm
7. Credibility algorithm
8. Application automation architecture
9. MVP implementation plan

Then implement the project incrementally.

Do not skip architectural planning.

