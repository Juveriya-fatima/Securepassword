import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { AppSidebar, AppTopBar } from "@/components/app/app-nav";
import { UnlockScreen } from "@/components/auth/unlock-screen";
import { useAuth } from "@/lib/auth/auth-context";
import { VaultProvider } from "@/lib/vault-store";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "SecurePass Dashboard — Passwords & Vault" },
      {
        name: "description",
        content:
          "Generate strong passwords and manage your saved credentials inside the SecurePass app.",
      },
      { property: "og:title", content: "SecurePass Dashboard" },
      {
        property: "og:description",
        content: "Generate strong passwords and manage saved credentials in one place.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate({ to: "/login" });
    }
  }, [status, navigate]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (status === "locked") {
    return <UnlockScreen />;
  }

  return (
    <VaultProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopBar />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            <Outlet />
          </main>
        </div>
      </div>
    </VaultProvider>
  );
}