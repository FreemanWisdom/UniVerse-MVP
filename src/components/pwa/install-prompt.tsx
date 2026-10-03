"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

/**
 * Install experience (Phase 6).
 *
 * - Chrome/Edge/Android (beforeinstallprompt): show an "Install app" button
 *   that triggers the native install prompt.
 * - iOS Safari: no prompt API exists — show the manual
 *   "Share → Add to Home Screen" hint instead.
 * - Already installed (standalone display-mode or navigator.standalone):
 *   confirm the state instead of offering a redundant install.
 * The captured beforeinstallprompt event is never cached beyond the tab:
 * it can be invalidated by the browser at any time, so a failed prompt()
 * simply falls back to the browser-menu hint.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const nav = navigator as any;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(standalone);
    const ua = nav.userAgent || "";
    setIsIOS(/iPad|iPhone|iPod/.test(ua) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => setDeferredPrompt(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {
      // prompt() was invalidated by the browser — fall back to hint state.
    }
    setDeferredPrompt(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-sm">Install App</CardTitle>
        <CardDescription>Put Universe ICOS on your home screen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isStandalone ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              You&rsquo;re running the installed app. Nice.
            </p>
            <Badge variant="campus">Installed</Badge>
          </div>
        ) : deferredPrompt ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Install Universe ICOS as an app for quicker access and full-screen use.
            </p>
            <Button onClick={install}>Install app</Button>
          </div>
        ) : isIOS ? (
          <div className="text-sm text-slate-400">
            On your iPhone or iPad: tap <span className="font-semibold text-foreground">Share</span>{" "}
            <span className="text-slate-500">(the square with an arrow)</span>, then{" "}
            <span className="font-semibold text-foreground">Add to Home Screen</span>.
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Your browser can install this site from its menu — look for{" "}
            <span className="font-semibold text-foreground">Install app</span> or{" "}
            <span className="font-semibold text-foreground">Add to Home screen</span>.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

