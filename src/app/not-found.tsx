import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-sm text-center space-y-4">
        <h2 className="text-xl font-bold text-ink">Page Not Found</h2>
        <p className="text-sm text-ink-muted">
          The page you requested could not be found.
        </p>
        <div className="pt-2">
          <ButtonLink href="/dashboard" variant="primary">
            Return to dashboard
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
