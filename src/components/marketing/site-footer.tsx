import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">
              Generate strong passwords. Stay secure.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <a href="/#features" className="text-muted-foreground hover:text-foreground">
              Features
            </a>
            <a href="/#security" className="text-muted-foreground hover:text-foreground">
              Security
            </a>
            <a href="/#security" className="text-muted-foreground hover:text-foreground">
              Privacy
            </a>
            <a href="/#how-it-works" className="text-muted-foreground hover:text-foreground">
              Terms
            </a>
            <Link to="/login" className="text-muted-foreground hover:text-foreground">
              Login
            </Link>
          </nav>
        </div>
        <p className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          © 2026 SecurePass. All rights reserved.
        </p>
      </div>
    </footer>
  );
}