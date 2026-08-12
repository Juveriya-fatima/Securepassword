import { createFileRoute } from "@tanstack/react-router";
import { PasswordGenerator } from "@/components/generator/password-generator";

export const Route = createFileRoute("/app/generate")({
  component: GeneratePage,
});

function GeneratePage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="sr-only">Generate a secure password</h1>
      <PasswordGenerator />
    </div>
  );
}