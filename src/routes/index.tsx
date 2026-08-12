import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  ClipboardCheck,
  Copy,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Vault,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ServiceIcon } from "@/components/service-icon";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SecurePass — Password Generator & Personal Vault" },
      {
        name: "description",
        content:
          "Create powerful passwords in seconds and keep your credentials organized in one secure place with SecurePass.",
      },
      { property: "og:title", content: "SecurePass — Password Generator & Vault" },
      {
        property: "og:description",
        content: "Generate strong passwords and keep your credentials organized in one place.",
      },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: KeyRound,
    title: "Strong Passwords",
    body: "Generate secure random passwords using customizable options.",
  },
  {
    icon: ClipboardCheck,
    title: "One-Click Copy",
    body: "Copy generated passwords instantly.",
  },
  {
    icon: Vault,
    title: "Password Vault",
    body: "Keep your saved credentials organized in one place.",
  },
  {
    icon: Search,
    title: "Easy Search",
    body: "Quickly find saved credentials whenever you need them.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Generate",
    body: "Choose your password preferences and generate a strong password.",
  },
  {
    number: "02",
    title: "Save",
    body: "Save the password with the website or service it belongs to.",
  },
  {
    number: "03",
    title: "Access",
    body: "Return anytime to find, copy, or manage your saved credentials.",
  },
];

const SECURITY = [
  { icon: Lock, title: "Private by Design", body: "Your passwords should remain private." },
  { icon: ShieldCheck, title: "Secure Storage", body: "Saved credentials are protected." },
  { icon: Zap, title: "Local Generation", body: "Passwords are generated instantly." },
];

function HeroPreview() {
  return (
    <div className="relative">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-lift">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Generated password
        </p>
        <p className="mt-3 break-all font-mono text-xl font-bold sm:text-2xl">G7@kP2#mL9$xQa8!</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-full rounded-full bg-success" />
          </div>
          <span className="shrink-0 text-xs font-semibold text-success">Very Strong</span>
        </div>
        <div className="mt-5 flex gap-2">
          <span className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-brand py-2.5 text-sm font-semibold text-brand-foreground">
            <RefreshCw className="size-4" aria-hidden="true" />
            Generate
          </span>
          <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold">
            <Copy className="size-4" aria-hidden="true" />
            Copy
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-3 rounded-3xl border border-border bg-card p-4 shadow-card sm:-ml-6 sm:mr-10 sm:mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Your vault
        </p>
        {[
          { service: "Gmail", username: "user@gmail.com" },
          { service: "GitHub", username: "developer@example.com" },
        ].map((item) => (
          <div key={item.service} className="flex items-center gap-3">
            <ServiceIcon service={item.service} className="size-9 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.service}</p>
              <p className="truncate text-xs text-muted-foreground">{item.username}</p>
            </div>
            <Check className="ml-auto size-4 shrink-0 text-success" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="bg-gradient-surface">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
                Password generator + personal vault
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] sm:text-5xl">
                Generate Strong Passwords.{" "}
                <span className="text-gradient-brand">Keep Them Secure.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
                Create powerful passwords in seconds and keep your credentials organized in one
                secure place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="brand" size="xl">
                  <Link to="/signup">Get Started</Link>
                </Button>
                <Button asChild variant="outline" size="xl">
                  <Link to="/login">Login</Link>
                </Button>
              </div>
            </div>
            <div className="lg:pl-6">
              <HeroPreview />
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="max-w-2xl font-display text-3xl font-bold sm:text-4xl">
            Everything You Need to Manage Your Passwords
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <feature.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">How It Works</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map((step) => (
                <article
                  key={step.number}
                  className="rounded-2xl border border-border bg-background p-6 transition-colors hover:border-primary/30"
                >
                  <span className="font-display text-3xl font-bold text-gradient-brand">
                    {step.number}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="security" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-brand p-8 text-brand-foreground sm:p-12">
            <h2 className="max-w-xl font-display text-3xl font-bold sm:text-4xl">
              Your Passwords. Your Privacy.
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {SECURITY.map((item) => (
                <article key={item.title} className="rounded-2xl bg-brand-foreground/10 p-6">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-foreground/15">
                    <item.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm opacity-85">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
