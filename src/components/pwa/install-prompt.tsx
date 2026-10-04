"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  ensureInstallListeners,
  getCapturedInstallPrompt,
  isIOSUserAgent,
  isStandaloneDisplay,
  subscribeInstallState,
  triggerInstall,
} from "@/lib/pwa-install";

/**
 * Install experience (Settings).
 *
 * - Chrome/Edge/Android (captured beforeinstallprompt): show an "Install app"
 *   button that triggers the native install prompt.
 * - iOS Safari: no prompt API exists — show the manual
 *   "Share → Add to Home Screen" hint instead.
 * - Already installed (standalone display-mode): confirm the state instead
 *   of offering a redundant install.
 * - Stale/invalidated events never hang the UI: the shared triggerInstall()
 *   caps the wait and this card falls back to the browser-menu guidance.
 */
export function InstallPrompt() {
  const [available, setAvailable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ensureInstallListeners();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(isStandaloneDisplay());
     
    setIsIOS(isIOSUserAgent());
    const sync = () => {
      setAvailable(getCapturedInstallPrompt() !== null);
      setIsStandalone(isStandaloneDisplay());
    };
    sync();
    return subscribeInstallState(sync);
  }, []);

  const install = async () => {
    // Fallback copy below stays honest: after a stale/no-op prompt the card
    // simply stops offering one-tap install (capture consumed).
    setBusy(true);
    await triggerInstall();
    setBusy(false);
    setAvailable(getCapturedInstallPrompt() !== null);
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
        ) : available || busy ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Install Universe ICOS as an app for quicker access and full-screen use.
            </p>
            <Button onClick={() => void install()} disabled={busy}>
              {busy ? "Installing…" : "Install app"}
            </Button>
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
