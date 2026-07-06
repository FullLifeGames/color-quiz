/** Tiny synthesized sound effects via WebAudio (no assets) + optional haptics. */

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, delay = 0, type: OscillatorType = 'sine', gain = 0.045): void {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function vibrate(pattern: number | number[]): void {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // not supported — ignore
  }
}

export const sfx = {
  select(): void {
    tone(620, 0.09);
  },
  swap(): void {
    tone(440, 0.08);
    tone(560, 0.1, 0.045);
    vibrate(8);
  },
  denied(): void {
    tone(175, 0.12, 0, 'square', 0.03);
  },
  hint(): void {
    tone(880, 0.16);
    tone(1170, 0.18, 0.09);
  },
  win(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone(f, 0.32, i * 0.11, 'triangle', 0.05));
    vibrate([15, 60, 25]);
  }
};
