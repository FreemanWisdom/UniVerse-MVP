import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4 px-4 text-center">
      <div className="text-6xl font-extrabold text-campus-500">404</div>
      <h1 className="text-2xl font-bold text-foreground">Page Not Found</h1>
      <p className="max-w-md text-sm text-slate-400">
        The campus link or module you requested does not exist or has been moved.
      </p>
      <div className="pt-2">
        <Link href="/">
          <Button variant="default">Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
