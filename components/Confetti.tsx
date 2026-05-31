"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export default function Confetti() {
  useEffect(() => {
    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        origin: { y: 0.7 },
        ...opts,
        particleCount: Math.floor(200 * particleRatio),
      });
    };

    fire(0.25, { spread: 26, startVelocity: 55, colors: ["#ff5733", "#ffd93d", "#00d4aa"] });
    fire(0.2,  { spread: 60, colors: ["#ff6b9d", "#6bcb77", "#c77dff"] });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ["#4cc9f0", "#ff9f1c"] });
    fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors: ["#ffd93d", "#ff5733"] });
    fire(0.1,  { spread: 120, startVelocity: 45, colors: ["#00d4aa", "#ff6b9d"] });
  }, []);

  return null;
}
