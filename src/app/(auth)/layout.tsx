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
          <Link href="/" className="flex items-center space-x-2">
            <span className="h-3.5 w-3.5 rounded-full bg-campus-500 shadow-[0_0_12px_#22c55e]" />
            <span className="text-xl font-bold tracking-tight text-foreground">
              UniVerse <span className="text-campus-500 font-mono text-sm">ICOS</span>
            </span>
          </Link>
          <p className="text-xs text-slate-400">Authentication Portal</p>
        </div>

        <Card className="border-surface-200 bg-surface-100/90 shadow-2xl">
          {children}
        </Card>

        <div className="text-center text-xs text-slate-500">
          <Link href="/" className="hover:text-campus-400 transition-colors">
            ← Return to UniVerse home
          </Link>
        </div>
      </div>
    </div>
  );
}
