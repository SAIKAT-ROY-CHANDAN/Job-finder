import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const features = [
    {
      title: "Master Profile",
      desc: "Enter your professional information once. JobPilot builds your master resume from it.",
    },
    {
      title: "Smart Matching",
      desc: "Every job gets a transparent match score based on deterministic rules and AI semantic analysis.",
    },
    {
      title: "Credibility Scoring",
      desc: "Know whether a job is likely legitimate before you invest time applying.",
    },
    {
      title: "Tailored Applications",
      desc: "Each job gets a customized resume, cover letter, and prepared application answers.",
    },
    {
      title: "You Control Apply",
      desc: "JobPilot never mass-applies. You review every application and explicitly confirm each submission.",
    },
    {
      title: "Application Tracker",
      desc: "Track every application from prepared to offer, with the exact resume you used.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="text-xl font-bold">JobPilot</div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight">
            Find fewer, but better jobs.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            JobPilot matches you with legitimate jobs that fit your profile, generates a
            customized resume for each one, and helps you submit high-quality applications —
            while you stay in control of every Apply.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/register">
              <Button size="lg">Start building your profile</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>
        </section>

        <section className="container pb-20">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          JobPilot — AI-assisted job search. Not an application spam bot.
        </div>
      </footer>
    </div>
  );
}
