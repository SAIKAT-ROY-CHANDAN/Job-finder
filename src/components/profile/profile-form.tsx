"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

type ProfileData = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  website: string | null;
  currentJobTitle: string | null;
  yearsOfExperience: number | null;
  preferredTitles: string[];
  preferredTech: string[];
  preferredIndustries: string[];
  workPreference: string | null;
  expectedSalaryMin: number | null;
  expectedSalaryMax: number | null;
  availability: string | null;
  bio: string | null;
  languages: string[];
};

type ExperienceItem = {
  id?: string;
  title: string;
  company: string;
  location?: string;
  employmentType?: string;
  startDate: string;
  endDate?: string;
  responsibilities: string[];
  achievements: string[];
  technologies: string[];
};

type EducationItem = {
  id?: string;
  degree: string;
  institution: string;
  startDate?: string;
  endDate?: string;
};

type CertificationItem = {
  id?: string;
  name: string;
  issuer: string;
  date?: string;
};

type ProjectItem = {
  id?: string;
  name: string;
  description?: string;
  technologies: string[];
  url?: string;
};

type InitialProfile = {
  id?: string;
  fullName?: string;
  email?: string;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  portfolio?: string | null;
  website?: string | null;
  currentJobTitle?: string | null;
  yearsOfExperience?: number | null;
  preferredTitles?: string[];
  preferredTech?: string[];
  preferredIndustries?: string[];
  workPreference?: string | null;
  expectedSalaryMin?: number | null;
  expectedSalaryMax?: number | null;
  availability?: string | null;
  bio?: string | null;
  languages?: string[];
  skills?: { id: string; name: string; category: string }[];
  user?: {
    skills?: { id: string; name: string; category: string }[];
    experiences?: ExperienceItem[];
    education?: EducationItem[];
    certifications?: CertificationItem[];
    projects?: ProjectItem[];
  };
};

const EMPTY_EXPERIENCE: ExperienceItem = {
  title: "",
  company: "",
  location: "",
  employmentType: "",
  startDate: "",
  endDate: "",
  responsibilities: [],
  achievements: [],
  technologies: [],
};

const EMPTY_EDUCATION: EducationItem = { degree: "", institution: "", startDate: "", endDate: "" };
const EMPTY_CERTIFICATION: CertificationItem = { name: "", issuer: "", date: "" };
const EMPTY_PROJECT: ProjectItem = { name: "", description: "", technologies: [], url: "" };

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Internship", "Contract", "Freelance", "Apprenticeship"];

function TagField({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const value = draft.trim();
    if (!value || tags.includes(value)) return;
    onChange([...tags, value]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <Badge key={t} variant="secondary">
            {t}
            <button
              type="button"
              className="ml-1 text-muted-foreground hover:text-foreground"
              onClick={() => onChange(tags.filter((v) => v !== t))}
            >
              ×
            </button>
          </Badge>
        ))}
      </div>
      <Input
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
    </div>
  );
}

function LinesField({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (lines: string[]) => void;
  placeholder: string;
}) {
  return (
    <Textarea
      rows={4}
      placeholder={placeholder}
      value={value.join("\n")}
      onChange={(e) =>
        onChange(e.target.value.split("\n").map((l) => l.replace(/^\s*[•\-*]\s*/, "").trim()).filter(Boolean))
      }
    />
  );
}

export function ProfileForm({ initial }: { initial: InitialProfile }) {
  const { toast } = useToast();
  const [form, setForm] = useState<ProfileData>({
    id: initial.id || "",
    fullName: initial.fullName || "",
    email: initial.email || "",
    phone: initial.phone || "",
    location: initial.location || "",
    linkedin: initial.linkedin || "",
    github: initial.github || "",
    portfolio: initial.portfolio || "",
    website: initial.website || "",
    currentJobTitle: initial.currentJobTitle || "",
    yearsOfExperience: initial.yearsOfExperience ?? null,
    preferredTitles: initial.preferredTitles || [],
    preferredTech: initial.preferredTech || [],
    preferredIndustries: initial.preferredIndustries || [],
    workPreference: initial.workPreference || null,
    expectedSalaryMin: initial.expectedSalaryMin ?? null,
    expectedSalaryMax: initial.expectedSalaryMax ?? null,
    availability: initial.availability || "",
    bio: initial.bio || "",
    languages: initial.languages || [],
  });

  const [skills, setSkills] = useState<{ id: string; name: string; category: string }[]>(
    initial.user?.skills || initial.skills || [],
  );
  const [newSkill, setNewSkill] = useState({ name: "", category: "FRONTEND" });
  const [experiences, setExperiences] = useState<ExperienceItem[]>(initial.user?.experiences || []);
  const [education, setEducation] = useState<EducationItem[]>(initial.user?.education || []);
  const [certifications, setCertifications] = useState<CertificationItem[]>(initial.user?.certifications || []);
  const [projects, setProjects] = useState<ProjectItem[]>(initial.user?.projects || []);
  const [loading, setLoading] = useState(false);

  const [expEditor, setExpEditor] = useState<ExperienceItem | null>(null);
  const [eduEditor, setEduEditor] = useState<EducationItem | null>(null);
  const [certEditor, setCertEditor] = useState<CertificationItem | null>(null);
  const [projectEditor, setProjectEditor] = useState<ProjectItem | null>(null);

  const [titleDraft, setTitleDraft] = useState("");
  const [techDraft, setTechDraft] = useState("");
  const [industryDraft, setIndustryDraft] = useState("");
  const [languageDraft, setLanguageDraft] = useState("");

  const set = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addListItem = (key: "preferredTitles" | "preferredTech" | "preferredIndustries", draft: string) => {
    const value = draft.trim();
    if (!value) return;
    setForm((prev) => {
      const current = prev[key] || [];
      if (current.includes(value)) return prev;
      return { ...prev, [key]: [...current, value] };
    });
  };

  const removeListItem = (key: "preferredTitles" | "preferredTech" | "preferredIndustries", value: string) => {
    setForm((prev) => ({ ...prev, [key]: (prev[key] || []).filter((v) => v !== value) }));
  };

  const handleListKey = (
    key: "preferredTitles" | "preferredTech" | "preferredIndustries",
    draft: string,
    setDraft: (v: string) => void,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addListItem(key, draft);
      setDraft("");
    }
  };

  const addLanguage = () => {
    const value = languageDraft.trim();
    if (!value || form.languages.includes(value)) return;
    set("languages", [...form.languages, value]);
    setLanguageDraft("");
  };
  const removeLanguage = (value: string) => set("languages", form.languages.filter((v) => v !== value));

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Save failed", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Profile saved" });
    } catch {
      toast({ title: "Error saving profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addSkill = async () => {
    if (!newSkill.name.trim()) return;
    const res = await fetch("/api/profile/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSkill),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Failed to add skill", description: data.error, variant: "destructive" });
      return;
    }
    setSkills((prev) => [...prev, data.data]);
    setNewSkill((prev) => ({ name: "", category: prev.category }));
  };

  const removeSkill = async (id: string) => {
    await fetch(`/api/profile/skills?id=${id}`, { method: "DELETE" });
    setSkills((prev) => prev.filter((s) => s.id !== id));
  };

  // --- Resource CRUD helpers ---------------------------------------------

  const saveResource = async (
    resource: "experience" | "education" | "certifications" | "projects",
    body: Record<string, unknown>,
  ) => {
    const res = await fetch(`/api/profile/${resource}`, {
      method: body.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Save failed", description: data.error, variant: "destructive" });
      return null;
    }
    return data.data as { id: string };
  };

  const deleteResource = async (resource: string, id: string) => {
    const res = await fetch(`/api/profile/${resource}?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Delete failed", variant: "destructive" });
      return false;
    }
    return true;
  };

  const saveExperience = async () => {
    if (!expEditor || !expEditor.title || !expEditor.company) return;
    const saved = await saveResource("experience", {
      ...expEditor,
      id: expEditor.id || undefined,
      location: expEditor.location || null,
      employmentType: expEditor.employmentType || null,
      endDate: expEditor.endDate || null,
    });
    if (!saved) return;
    setExperiences((prev) =>
      expEditor.id
        ? prev.map((e) => (e.id === expEditor.id ? { ...expEditor, id: e.id } : e))
        : [...prev, { ...expEditor, id: saved.id }],
    );
    setExpEditor(null);
  };

  const saveEducation = async () => {
    if (!eduEditor || !eduEditor.degree) return;
    const saved = await saveResource("education", {
      ...eduEditor,
      id: eduEditor.id || undefined,
      endDate: eduEditor.endDate || null,
    });
    if (!saved) return;
    setEducation((prev) =>
      eduEditor.id
        ? prev.map((e) => (e.id === eduEditor.id ? { ...eduEditor, id: e.id } : e))
        : [...prev, { ...eduEditor, id: saved.id }],
    );
    setEduEditor(null);
  };

  const saveCertification = async () => {
    if (!certEditor || !certEditor.name) return;
    const saved = await saveResource("certifications", {
      ...certEditor,
      id: certEditor.id || undefined,
      date: certEditor.date || null,
    });
    if (!saved) return;
    setCertifications((prev) =>
      certEditor.id
        ? prev.map((c) => (c.id === certEditor.id ? { ...certEditor, id: c.id } : c))
        : [...prev, { ...certEditor, id: saved.id }],
    );
    setCertEditor(null);
  };

  const saveProject = async () => {
    if (!projectEditor || !projectEditor.name) return;
    const saved = await saveResource("projects", {
      ...projectEditor,
      id: projectEditor.id || undefined,
      description: projectEditor.description || null,
      url: projectEditor.url || null,
    });
    if (!saved) return;
    setProjects((prev) =>
      projectEditor.id
        ? prev.map((p) => (p.id === projectEditor.id ? { ...projectEditor, id: p.id } : p))
        : [...prev, { ...projectEditor, id: saved.id }],
    );
    setProjectEditor(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={form.location || ""} onChange={(e) => set("location", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>LinkedIn</Label>
            <Input value={form.linkedin || ""} onChange={(e) => set("linkedin", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>GitHub</Label>
            <Input value={form.github || ""} onChange={(e) => set("github", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Portfolio</Label>
            <Input value={form.portfolio || ""} onChange={(e) => set("portfolio", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={form.website || ""} onChange={(e) => set("website", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Professional Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Current job title</Label>
            <Input value={form.currentJobTitle || ""} onChange={(e) => set("currentJobTitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Years of experience</Label>
            <Input
              type="number"
              value={form.yearsOfExperience ?? ""}
              onChange={(e) => set("yearsOfExperience", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Preferred job titles</Label>
            <div className="flex flex-wrap gap-2">
              {form.preferredTitles.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                  <button
                    type="button"
                    className="ml-1 text-muted-foreground hover:text-foreground"
                    onClick={() => removeListItem("preferredTitles", t)}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="e.g. Senior Frontend Developer"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => handleListKey("preferredTitles", titleDraft, setTitleDraft, e)}
            />
            <p className="text-xs text-muted-foreground">Type a title and press Enter (or comma) to add it.</p>
          </div>
          <div className="space-y-2">
            <Label>Preferred technologies</Label>
            <div className="flex flex-wrap gap-2">
              {form.preferredTech.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                  <button
                    type="button"
                    className="ml-1 text-muted-foreground hover:text-foreground"
                    onClick={() => removeListItem("preferredTech", t)}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="e.g. React"
              value={techDraft}
              onChange={(e) => setTechDraft(e.target.value)}
              onKeyDown={(e) => handleListKey("preferredTech", techDraft, setTechDraft, e)}
            />
            <p className="text-xs text-muted-foreground">Type a technology and press Enter (or comma) to add it.</p>
          </div>
          <div className="space-y-2">
            <Label>Preferred industries</Label>
            <div className="flex flex-wrap gap-2">
              {form.preferredIndustries.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                  <button
                    type="button"
                    className="ml-1 text-muted-foreground hover:text-foreground"
                    onClick={() => removeListItem("preferredIndustries", t)}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="e.g. Technology"
              value={industryDraft}
              onChange={(e) => setIndustryDraft(e.target.value)}
              onKeyDown={(e) => handleListKey("preferredIndustries", industryDraft, setIndustryDraft, e)}
            />
            <p className="text-xs text-muted-foreground">Type an industry and press Enter (or comma) to add it.</p>
          </div>
          <div className="space-y-2">
            <Label>Work preference</Label>
            <Select
              value={form.workPreference || ""}
              onValueChange={(v) => set("workPreference", v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REMOTE">Remote</SelectItem>
                <SelectItem value="HYBRID">Hybrid</SelectItem>
                <SelectItem value="ONSITE">On-site</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Expected salary (min)</Label>
            <Input
              type="number"
              value={form.expectedSalaryMin ?? ""}
              onChange={(e) => set("expectedSalaryMin", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Expected salary (max)</Label>
            <Input
              type="number"
              value={form.expectedSalaryMax ?? ""}
              onChange={(e) => set("expectedSalaryMax", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Availability</Label>
            <Input value={form.availability || ""} onChange={(e) => set("availability", e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Bio / summary</Label>
            <Textarea value={form.bio || ""} onChange={(e) => set("bio", e.target.value)} rows={4} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Languages</Label>
            <div className="flex flex-wrap gap-2">
              {form.languages.map((l) => (
                <Badge key={l} variant="secondary">
                  {l}
                  <button
                    type="button"
                    className="ml-1 text-muted-foreground hover:text-foreground"
                    onClick={() => removeLanguage(l)}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="e.g. Bangla (Native)"
              value={languageDraft}
              onChange={(e) => setLanguageDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addLanguage();
                }
              }}
              onBlur={addLanguage}
            />
            <p className="text-xs text-muted-foreground">
              One per line style — e.g. English (Professional working proficiency). Press Enter (or comma) to add.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {expEditor && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Job title</Label>
                  <Input
                    value={expEditor.title}
                    onChange={(e) => setExpEditor({ ...expEditor, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={expEditor.company}
                    onChange={(e) => setExpEditor({ ...expEditor, company: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={expEditor.location || ""}
                    onChange={(e) => setExpEditor({ ...expEditor, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employment type</Label>
                  <Select
                    value={expEditor.employmentType || ""}
                    onValueChange={(v) => setExpEditor({ ...expEditor, employmentType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input
                    placeholder="e.g. 2024-12"
                    value={expEditor.startDate}
                    onChange={(e) => setExpEditor({ ...expEditor, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End date (or Present)</Label>
                  <Input
                    placeholder="e.g. Present"
                    value={expEditor.endDate || ""}
                    onChange={(e) => setExpEditor({ ...expEditor, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Responsibilities (one per line)</Label>
                <LinesField
                  value={expEditor.responsibilities}
                  onChange={(v) => setExpEditor({ ...expEditor, responsibilities: v })}
                  placeholder={"Led the migration to TypeScript\nReduced deploy time by 40%"}
                />
              </div>
              <div className="space-y-2">
                <Label>Achievements (one per line)</Label>
                <LinesField
                  value={expEditor.achievements}
                  onChange={(v) => setExpEditor({ ...expEditor, achievements: v })}
                  placeholder={"Cut support tickets by 30%\nPromoted after first year"}
                />
              </div>
              <div className="space-y-2">
                <Label>Technologies</Label>
                <TagField
                  tags={expEditor.technologies}
                  onChange={(v) => setExpEditor({ ...expEditor, technologies: v })}
                  placeholder="Type a technology and press Enter"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveExperience} disabled={!expEditor.title || !expEditor.company}>
                  {expEditor.id ? "Update" : "Add"} Experience
                </Button>
                <Button variant="outline" onClick={() => setExpEditor(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {experiences.map((e) => (
            <div key={e.id || `${e.company}-${e.title}`} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {e.title} — {e.company}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[e.location, e.employmentType, e.startDate && (e.endDate ? `${e.startDate} – ${e.endDate}` : e.startDate)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpEditor({ ...EMPTY_EXPERIENCE, ...e })}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (e.id && (await deleteResource("experience", e.id))) {
                        setExperiences((prev) => prev.filter((x) => x.id !== e.id));
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {!expEditor && (
            <Button variant="outline" onClick={() => setExpEditor(EMPTY_EXPERIENCE)}>
              + Add Experience
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Education</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {eduEditor && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label>Degree</Label>
                <Input value={eduEditor.degree} onChange={(e) => setEduEditor({ ...eduEditor, degree: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Institution</Label>
                <Input
                  value={eduEditor.institution}
                  onChange={(e) => setEduEditor({ ...eduEditor, institution: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input
                    placeholder="e.g. 2021-12"
                    value={eduEditor.startDate || ""}
                    onChange={(e) => setEduEditor({ ...eduEditor, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input
                    placeholder="e.g. 2025-12"
                    value={eduEditor.endDate || ""}
                    onChange={(e) => setEduEditor({ ...eduEditor, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveEducation} disabled={!eduEditor.degree}>
                  {eduEditor.id ? "Update" : "Add"} Education
                </Button>
                <Button variant="outline" onClick={() => setEduEditor(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {education.map((e) => (
            <div key={e.id || `${e.degree}-${e.institution}`} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {e.degree} — {e.institution}
                  </p>
                  {e.startDate && (
                    <p className="text-xs text-muted-foreground">
                      {e.endDate ? `${e.startDate} – ${e.endDate}` : e.startDate}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEduEditor({ ...EMPTY_EDUCATION, ...e })}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (e.id && (await deleteResource("education", e.id))) {
                        setEducation((prev) => prev.filter((x) => x.id !== e.id));
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {!eduEditor && (
            <Button variant="outline" onClick={() => setEduEditor(EMPTY_EDUCATION)}>
              + Add Education
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {certEditor && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={certEditor.name} onChange={(e) => setCertEditor({ ...certEditor, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Issuer</Label>
                <Input
                  value={certEditor.issuer}
                  onChange={(e) => setCertEditor({ ...certEditor, issuer: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  placeholder="e.g. 2024-03"
                  value={certEditor.date || ""}
                  onChange={(e) => setCertEditor({ ...certEditor, date: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveCertification} disabled={!certEditor.name}>
                  {certEditor.id ? "Update" : "Add"} Certification
                </Button>
                <Button variant="outline" onClick={() => setCertEditor(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {certifications.map((c) => (
            <div key={c.id || c.name} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[c.issuer, c.date].filter(Boolean).join(" — ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCertEditor({ ...EMPTY_CERTIFICATION, ...c })}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (c.id && (await deleteResource("certifications", c.id))) {
                        setCertifications((prev) => prev.filter((x) => x.id !== c.id));
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {!certEditor && (
            <Button variant="outline" onClick={() => setCertEditor(EMPTY_CERTIFICATION)}>
              + Add Certification
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {projectEditor && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label>Project name</Label>
                <Input
                  value={projectEditor.name}
                  onChange={(e) => setProjectEditor({ ...projectEditor, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={projectEditor.description || ""}
                  onChange={(e) => setProjectEditor({ ...projectEditor, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Technologies</Label>
                <TagField
                  tags={projectEditor.technologies}
                  onChange={(v) => setProjectEditor({ ...projectEditor, technologies: v })}
                  placeholder="Type a technology and press Enter"
                />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={projectEditor.url || ""}
                  onChange={(e) => setProjectEditor({ ...projectEditor, url: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveProject} disabled={!projectEditor.name}>
                  {projectEditor.id ? "Update" : "Add"} Project
                </Button>
                <Button variant="outline" onClick={() => setProjectEditor(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {projects.map((p) => (
            <div key={p.id || p.name} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.technologies.join(" · ")}</p>
                  {p.description && <p className="mt-1 text-sm">{p.description}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setProjectEditor({ ...EMPTY_PROJECT, ...p })}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (p.id && (await deleteResource("projects", p.id))) {
                        setProjects((prev) => prev.filter((x) => x.id !== p.id));
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {!projectEditor && (
            <Button variant="outline" onClick={() => setProjectEditor(EMPTY_PROJECT)}>
              + Add Project
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <Badge key={s.id} variant="secondary">
                {s.name}
                <button
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  onClick={() => removeSkill(s.id)}
                >
                  ×
                </button>
              </Badge>
            ))}
            {skills.length === 0 && <p className="text-sm text-muted-foreground">No skills added.</p>}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Skill name"
              value={newSkill.name}
              onChange={(e) => setNewSkill((p) => ({ ...p, name: e.target.value }))}
            />
            <Select value={newSkill.category} onValueChange={(v) => setNewSkill((p) => ({ ...p, category: v }))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FRONTEND">Frontend</SelectItem>
                <SelectItem value="BACKEND">Backend</SelectItem>
                <SelectItem value="DATABASE">Database</SelectItem>
                <SelectItem value="DEVOPS">DevOps</SelectItem>
                <SelectItem value="TOOLS">Tools</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addSkill} type="button" variant="outline">
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}