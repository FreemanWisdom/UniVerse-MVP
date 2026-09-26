import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-16">
      <div className="flex flex-col items-center text-center space-y-6">
        <Badge variant="campus">Phase 1 Foundation</Badge>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          Integrated Campus <br />
          <span className="bg-gradient-to-r from-campus-400 to-campus-600 bg-clip-text text-transparent">
            Operating System
          </span>
        </h1>
        <p className="max-w-2xl text-base md:text-lg text-slate-400">
          The unified digital campus environment for Nigerian students. Connecting Orbit feed, Study tribes, AI tutoring, campus chat, and whispers in a single secure platform.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link href="/login">
            <Button size="lg" variant="default">
              Launch Student App
            </Button>
          </Link>
          <Link href="/admin">
            <Button size="lg" variant="outline">
              Admin Portal
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
        <Card>
          <CardHeader>
            <CardTitle>Orbit Feed</CardTitle>
            <CardDescription>
              Campus updates, verified discussions, and real-time student interactions.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Study Hub & Tribes</CardTitle>
            <CardDescription>
              Course resources, study bookmarks, tribes, and AI tutor assistance.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Campus Chat & Whisper</CardTitle>
            <CardDescription>
              Direct student communication and privacy-first anonymous campus discourse.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
