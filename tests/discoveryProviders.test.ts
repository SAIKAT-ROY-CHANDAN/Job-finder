import { describe, it, expect } from "vitest";
import { normalizeRssFeed, deriveRssCompany, stripHtml } from "@/lib/discovery/providers/rss";
import { normalizeJSearchJobs } from "@/lib/discovery/providers/jsearch";
import { normalizeRemoteOkJobs } from "@/lib/discovery/providers/remoteok";
import { normalizeJobicyJobs } from "@/lib/discovery/providers/jobicy";
import { normalizeArbeitnowJobs } from "@/lib/discovery/providers/arbeitnow";
import { parseLinkedInSearchCards, extractLinkedInDescription } from "@/lib/discovery/providers/linkedin";

describe("RSS provider", () => {
  it("normalizes a feed into RawJobInput with source metadata", () => {
    const feed = {
      title: "RemoteOK",
      link: "https://remoteok.com",
      image: { url: "https://remoteok.com/favicon.ico" },
      items: [
        {
          title: "Senior React Engineer",
          link: "https://remoteok.com/remote-jobs/123",
          contentSnippet: "We are hiring a Senior React Engineer to build <UI> components.",
          isoDate: "2026-08-01T10:00:00.000Z",
        },
      ],
    };

    const jobs = normalizeRssFeed(feed, "https://remoteok.com/feed.rss");
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      sourceName: "RemoteOK",
      sourceType: "RSS_FEED",
      title: "Senior React Engineer",
      location: "Remote",
      remote: true,
      sourceUrl: "https://remoteok.com/remote-jobs/123",
      sourceLogoUrl: "https://remoteok.com/favicon.ico",
      sourceHomePageUrl: "https://remoteok.com",
      sourceFeedUrl: "https://remoteok.com/feed.rss",
    });
    expect(jobs[0].publishedAt).toEqual(new Date("2026-08-01T10:00:00.000Z"));
  });

  it("derives the company from an 'at Company' title suffix", () => {
    const jobs = normalizeRssFeed(
      { title: "We Work Remotely", link: "https://weworkremotely.com", items: [{ title: "Product Designer at Spotify", link: "https://x/job" }] },
      "https://weworkremotely.com/jobs.rss",
    );
    expect(jobs[0].company).toBe("Spotify");
  });

  it("drops items without a title or link", () => {
    const jobs = normalizeRssFeed(
      { title: "F", link: "https://f", items: [{ title: "No link" }, { link: "https://x", title: undefined }] },
      "https://f/feed",
    );
    expect(jobs).toHaveLength(0);
  });

  it("strips HTML from description content", () => {
    expect(stripHtml("<p>React &amp; Node <strong>remote</strong></p>")).toContain("React & Node remote");
  });

  it("falls back to creator then hostname for company", () => {
    expect(deriveRssCompany({ creator: "Acme Inc" }, "feed")).toBe("Acme Inc");
    expect(deriveRssCompany({ title: "Engineer" }, "https://example.com/feed")).toBe("example.com");
    expect(deriveRssCompany({}, "My Feed")).toBe("My Feed");
  });
});

describe("JSearch (Google Jobs) provider", () => {
  it("normalizes results, preserving LinkedIn publisher visibility", () => {
    const jobs = normalizeJSearchJobs([
      {
        job_id: "g1",
        job_title: "Frontend Engineer",
        job_description: "React + TypeScript",
        employer_name: "Acme",
        job_city: "Remote",
        job_is_remote: true,
        job_apply_link: "https://acme.apply/1",
        job_salary_min: 90000,
        job_salary_max: 120000,
        job_salary_currency: "USD",
        job_posted_at_datetime_utc: "2026-08-15T09:00:00.000Z",
        job_publisher: "linkedin",
        job_expired: false,
      },
      {
        job_id: "g2",
        job_title: "Backend Engineer",
        employer_name: "Globex",
        job_publisher: "indeed",
        job_expired: false,
      },
    ]);

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      sourceName: "LinkedIn",
      sourceType: "GOOGLE_JOBS",
      title: "Frontend Engineer",
      company: "Acme",
      remote: true,
      location: "Remote",
      sourceUrl: "https://acme.apply/1",
      salaryMin: 90000,
      salaryMax: 120000,
      salaryCurrency: "USD",
      sourceLogoUrl: "https://www.linkedin.com/favicon.ico",
      sourceHomePageUrl: "https://www.linkedin.com",
    });
    expect(jobs[1].sourceName).toBe("Google Jobs");
  });

  it("filters out expired or incomplete listings", () => {
    const jobs = normalizeJSearchJobs([
      { job_id: "x", job_title: "Expired", employer_name: "Acme", job_expired: true },
      { job_id: "y", job_title: "No employer", job_expired: false },
      { job_id: "z", job_title: "Good", employer_name: "Acme", job_expired: false },
    ]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("Good");
  });
});

describe("RemoteOK provider", () => {
  it("normalizes listings, skipping zero salary and preferring apply_url", () => {
    const jobs = normalizeRemoteOkJobs([
      {
        id: "r1",
        position: "  Senior Full Stack Engineer  ",
        company: "Acme",
        location: "Remote",
        tags: ["React", "including", "Node"],
        date: "2026-08-20T10:00:00+00:00",
        apply_url: "https://acme.apply/1",
        url: "https://remoteok.com/remote-jobs/x-r1",
        salary_min: 0,
        salary_max: 0,
        description: "<p>React &amp; Node focused role.</p>",
      },
      {
        id: "r2",
        position: "Designer",
        company: "Globex",
        salary_min: 80000,
        salary_max: 100000,
        url: "https://remoteok.com/remote-jobs/y-r2",
      },
      { id: "r3", position: "No company" },
    ]);

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      sourceName: "RemoteOK",
      sourceType: "API_SOURCE",
      title: "Senior Full Stack Engineer",
      company: "Acme",
      remote: true,
      location: "Remote",
      sourceUrl: "https://acme.apply/1",
      description: expect.stringContaining("React & Node"),
      salaryMin: undefined,
      salaryMax: undefined,
      salaryCurrency: undefined,
    });
    expect(jobs[0].tech).toEqual(["react", "including", "node"]);
    expect(jobs[0].publishedAt).toEqual(new Date("2026-08-20T10:00:00+00:00"));

    expect(jobs[1]).toMatchObject({
      sourceUrl: "https://remoteok.com/remote-jobs/y-r2",
      salaryMin: 80000,
      salaryMax: 100000,
      salaryCurrency: "USD",
    });
  });
});

describe("Jobicy provider", () => {
  it("normalizes listings, flattening HTML description and industry", () => {
    const jobs = normalizeJobicyJobs([
      {
        id: 1,
        url: "https://jobicy.com/jobs/1-role",
        jobTitle: "Platform Engineer",
        companyName: "Example Co",
        jobIndustry: ["Software Engineering"],
        jobGeo: "USA",
        jobDescription: "<p>Build the platform with <strong>Kubernetes</strong>.</p>",
        pubDate: "2026-08-25T12:00:00+00:00",
        salaryMin: 120000,
        salaryMax: 140000,
        salaryCurrency: "USD",
      },
      { id: 2, jobTitle: "No company" },
    ]);

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      sourceName: "Jobicy",
      sourceType: "API_SOURCE",
      title: "Platform Engineer",
      company: "Example Co",
      location: "USA",
      remote: true,
      sourceUrl: "https://jobicy.com/jobs/1-role",
      salaryMin: 120000,
      salaryMax: 140000,
      salaryCurrency: "USD",
      category: "Software Engineering",
      description: expect.stringContaining("Kubernetes"),
    });
    expect(jobs[0].publishedAt).toEqual(new Date("2026-08-25T12:00:00+00:00"));
  });
});

describe("Arbeitnow provider", () => {
  it("normalizes listings with explicit remote flag and unix dates", () => {
    const jobs = normalizeArbeitnowJobs([
      {
        slug: "a1",
        title: "DevOps Engineer",
        company_name: "CloudWorks",
        description: "<p>CI/CD and <strong>Terraform</strong>.</p>",
        remote: true,
        url: "https://www.arbeitnow.com/jobs/companies/cloudworks/a1",
        tags: ["DevOps", "Cloud"],
        location: "Berlin, Remote",
        created_at: 1788327027,
      },
      { slug: "a2", title: "On-site", company_name: "LocalCo", remote: false },
    ]);

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      sourceName: "Arbeitnow",
      sourceType: "API_SOURCE",
      title: "DevOps Engineer",
      company: "CloudWorks",
      remote: true,
      location: "Berlin, Remote",
      sourceUrl: "https://www.arbeitnow.com/jobs/companies/cloudworks/a1",
      category: "devops",
      description: expect.stringContaining("Terraform"),
    });
    expect(jobs[0].tech).toEqual(["devops", "cloud"]);
    expect(jobs[0].publishedAt).toEqual(new Date(1788327027 * 1000));
    expect(jobs[1].remote).toBe(false);
  });
});

describe("LinkedIn guest provider", () => {
  const cardHtml = `
<main class="jobs-search__results-list">
  <li>
    <div class="base-card base-search-card job-search-card" data-entity-urn="urn:li:jobPosting:4457197699">
      <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/software-developer-at-avion-4457197699?position=1"></a>
      <div class="base-search-card__info">
        <h3 class="base-search-card__title">
          Software Developer
        </h3>
        <h4 class="base-search-card__subtitle">
          <a class="hidden-nested-link">Avion Solutions, Inc.</a>
        </h4>
        <div class="base-search-card__metadata">
          <span class="job-search-card__location">Corpus Christi, TX</span>
          <time class="job-search-card__listdate" datetime="2026-08-25">1 week ago</time>
        </div>
      </div>
    </div>
    <div class="duplicate-card" data-entity-urn="urn:li:jobPosting:4457197699"></div>
  </li>
  <li>
    <div class="base-card base-search-card job-search-card" data-entity-urn="urn:li:jobPosting:4460000001">
      <div class="base-search-card__info">
        <h3 class="base-search-card__title">Remote Backend Engineer</h3>
        <h4 class="base-search-card__subtitle"><a class="hidden-nested-link">Initech</a></h4>
        <div class="base-search-card__metadata">
          <span class="job-search-card__location">Remote</span>
        </div>
      </div>
    </div>
  </li>
</main>`;

  it("parses search cards into stable canonical URLs, ignoring duplicates", () => {
    const cards = parseLinkedInSearchCards(cardHtml);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      id: "4457197699",
      title: "Software Developer",
      company: "Avion Solutions, Inc.",
      location: "Corpus Christi, TX",
      publishedAt: "2026-08-25",
    });
    expect(cards[0].url).toBe("https://www.linkedin.com/jobs/view/4457197699");
    expect(cards[1].location).toBe("Remote");
  });

  it("skips cards missing a title or company", () => {
    const broken = `<li><div class="base-card job-search-card" data-entity-urn="urn:li:jobPosting:999">
      <h3 class="base-search-card__title">Orphan</h3></div></li>`;
    expect(parseLinkedInSearchCards(broken)).toHaveLength(0);
  });

  it("extracts flattened description from the guest job page", () => {
    const html = `
      <div class="show-more-less-html__markup show-more-less-html__markup--clamp-after-5 relative overflow-hidden">
        Build <strong>React</strong> apps. &amp; deploy.
        <ul><li>Write TypeScript</li></ul>
      </div>`;
    const desc = extractLinkedInDescription(html);
    expect(desc).toContain("Build React apps. & deploy.");
  });

  it("returns empty when the description block is missing", () => {
    expect(extractLinkedInDescription("<div>no description here</div>")).toBe("");
  });
});