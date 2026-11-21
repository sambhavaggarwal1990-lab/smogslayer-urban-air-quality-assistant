import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { SmogSlayerDashboard } from "@/components/dashboard/SmogSlayerDashboard";
import { MistIntro } from "@/components/intro/MistIntro";
import { SmogCanvas, createSmogParams } from "@/components/smog/SmogCanvas";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmogSlayer — Beat the smog, one habit at a time" },
      {
        name: "description",
        content: "Check today's air in your city, the best hours to step outside and low-emission habits for your family.",
      },
      { property: "og:title", content: "SmogSlayer — Mist Breathing" },
      {
        property: "og:description",
        content: "Your clean-air action plan: live AQI, best hours outdoors and greener commute tips.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  // One smog layer lives for the whole visit: the intro drives it, then it keeps drifting behind the app.
  const smog = useRef(createSmogParams());
  const [showApp, setShowApp] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  return (
    <div className="relative min-h-screen bg-background">
      <SmogCanvas params={smog} className="pointer-events-none fixed inset-0 z-0 h-screen w-screen" />
      {showApp && (
        <div className="relative z-10 animate-fade-in">
          <SmogSlayerDashboard />
        </div>
      )}
      {!introDone && (
        <MistIntro smog={smog} onReveal={() => setShowApp(true)} onComplete={() => setIntroDone(true)} />
      )}
    </div>
  );
}
