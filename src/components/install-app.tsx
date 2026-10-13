"use client";

import { Download, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { useAppDisplay } from "@/hooks/use-app-display";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallApp() {
  const mode = useAppDisplay();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  useEffect(() => {
    const receive = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    const installed = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", receive);
    window.addEventListener("appinstalled", installed);
    return () => { window.removeEventListener("beforeinstallprompt", receive); window.removeEventListener("appinstalled", installed); };
  }, []);
  if (mode === "standalone" || mode === "unknown") return null;

  return <div id="install-app"><Card className="install-app"><div className="install-app-heading"><Smartphone size={23} /><h2>Use KemTech as an app</h2></div>
    <p>Open KemTech from your Home Screen for a full app view, without the browser address bar or toolbars.</p>
    {installPrompt ? <Button onClick={async () => { await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); }}><Download size={17} /> Install KemTech</Button> : <details open={mode === "ios"}><summary>Add to Home Screen</summary>
      {mode === "ios" ? <ol><li>Open KemTech in Safari. If you opened it inside another app, tap the compass button to open Safari.</li><li>Tap Share, then Add to Home Screen.</li><li>Turn on Open as Web App if shown, then tap Add.</li><li>Launch KemTech using the new Home Screen icon.</li></ol> : <p>Open your browser menu and choose Install app or Add to Home Screen, then open the KemTech icon. On iPhone, use Safari → Share → Add to Home Screen.</p>}
    </details>}
  </Card></div>;
}
