import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { isAuthenticated } from "@/lib/auth/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await isAuthenticated()) {
    redirect("/orbit");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-campus-500 shadow-[0_0_12px_#22c55e]" aria-hidden="true" />
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              UniVerse
            </span>
          </Link>
          <p className="text-xs text-slate-400">Integrated Campus Operating System</p>
        </div>

        <Card className="border-surface-200 bg-surface-100/90 shadow-2xl">
          {children}
        </Card>

        <div className="text-center text-xs text-slate-500">
          <Link href="/" className="hover:text-campus-400 transition-colors">
            ← Return to UniVerse ICOS home
          </Link>
        </div>
      </div>
    </div>
  );
}
