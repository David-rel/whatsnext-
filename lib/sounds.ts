// Web Audio API sound effects — no package needed
// Uses a singleton AudioContext to avoid browser limits

let _ctx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_ctx) _ctx = new AudioContext();
    if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
    return _ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.25,
  delay = 0,
) {
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + delay);
  gain.gain.setValueAtTime(vol, c.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + dur + 0.01);
}

export const sounds = {
  tick()       { tone(880,  0.07, "square",   0.12); },
  urgentTick() { tone(1100, 0.07, "square",   0.18); },
  submit()     { tone(523,  0.08, "sine",     0.20); tone(784, 0.12, "sine", 0.20, 0.09); },
  reveal()     { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "sine", 0.18, i * 0.08)); },
  win()        { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, "sine", 0.22, i * 0.09)); },
  wrong()      { tone(220, 0.12, "sawtooth", 0.15); tone(180, 0.18, "sawtooth", 0.12, 0.14); },
};
