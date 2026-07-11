import {LaunchTitle} from "@/components/landing/launch-title";
import {ParticleField} from "@/components/landing/particle-field";

export default function HomePage() {
  return (
    <main className="launch-page">
      <ParticleField />
      <LaunchTitle />
    </main>
  );
}
