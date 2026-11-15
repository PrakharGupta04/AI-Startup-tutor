import Link from "next/link";
import { redirect } from "next/navigation";
import { NotebookPen, Newspaper, MessagesSquare } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { LoginForm } from "@/components/login-form";

export const instant = false;

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-canvas">
      {/* Left panel on lg screens */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand text-white flex-col justify-between p-12 lg:p-16">
        <div>
          <div className="w-10 h-10 rounded-md bg-white text-brand flex items-center justify-center font-bold text-lg mb-6">
            C
          </div>
          <h1 className="font-serif text-3xl font-semibold text-white tracking-tight">
            Corporate Startup Tutor
          </h1>
          <p className="mt-4 text-base text-brand-soft/90 max-w-md leading-relaxed">
            Reflect on class, follow corporate–startup collaboration news, and
            learn together with an AI tutor.
          </p>

          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3.5 text-white/90">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white shrink-0">
                <NotebookPen className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <span className="text-sm font-medium">Class reflections</span>
            </div>
            <div className="flex items-center gap-3.5 text-white/90">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white shrink-0">
                <Newspaper className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <span className="text-sm font-medium">Collaboration news</span>
            </div>
            <div className="flex items-center gap-3.5 text-white/90">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white shrink-0">
                <MessagesSquare className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <span className="text-sm font-medium">Shared AI tutor</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-brand-soft/60">
          Cohort Learning Platform
        </div>
      </div>

      {/* Right panel: Form centered */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Small screen brand header */}
          <div className="lg:hidden text-center mb-6">
            <div className="mx-auto w-10 h-10 rounded-md bg-brand text-white flex items-center justify-center font-bold text-lg mb-3">
              C
            </div>
            <h1 className="font-serif text-2xl font-semibold text-ink">
              Corporate Startup Tutor
            </h1>
            <p className="text-sm text-ink-muted mt-1">Sign in to your account</p>
          </div>

          <Card>
            <div className="hidden lg:block mb-5">
              <h2 className="text-xl font-semibold text-ink">Sign in</h2>
              <p className="text-sm text-ink-muted mt-1">
                Enter your credentials to continue
              </p>
            </div>

            <LoginForm />

            <div className="mt-6 text-center text-sm text-ink-muted">
              Do not have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-accent hover:underline"
              >
                Register
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
