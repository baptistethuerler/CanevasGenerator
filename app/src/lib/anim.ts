import type { Timing } from "./model";

export type PhaseKind = "in" | "hold" | "cross";

export interface Phase {
  kind: PhaseKind;
  from: number;    // index du slide affiché au début de la phase
  to: number;      // index du slide cible (== from sauf pour "cross")
  duration: number; // en secondes
}

export interface FrameState {
  kind: PhaseKind;
  from: number;
  to: number;
  t: number; // progression 0..1 dans la phase
}

/**
 * Séquence d'animation d'une story : `in → hold → (cross → hold)×(count-1)`.
 * PAS de fondu sortant : la liste se termine toujours sur un `hold` du dernier slide
 * (dernière image figée). La « respiration » finale est gérée par le module vidéo.
 */
export function buildStoryPhases(count: number, timing: Timing): Phase[] {
  if (count <= 0) return [];
  const { duration, transition } = timing;
  const phases: Phase[] = [
    { kind: "in", from: 0, to: 0, duration: transition },
    { kind: "hold", from: 0, to: 0, duration },
  ];
  for (let i = 1; i < count; i++) {
    phases.push({ kind: "cross", from: i - 1, to: i, duration: transition });
    phases.push({ kind: "hold", from: i, to: i, duration });
  }
  return phases;
}

export function phasesTotalDuration(phases: Phase[]): number {
  return phases.reduce((sum, p) => sum + p.duration, 0);
}

/**
 * État de rendu à l'instant `time` (secondes). Au-delà de la durée totale,
 * renvoie la dernière phase avec t=1 (image figée). Liste vide → hold slide 0.
 */
export function frameAt(phases: Phase[], time: number): FrameState {
  if (phases.length === 0) return { kind: "hold", from: 0, to: 0, t: 1 };
  let acc = 0;
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    const isLast = i === phases.length - 1;
    if (time < acc + p.duration || isLast) {
      const t = p.duration > 0 ? Math.min(1, Math.max(0, (time - acc) / p.duration)) : 1;
      return { kind: p.kind, from: p.from, to: p.to, t };
    }
    acc += p.duration;
  }
  const last = phases[phases.length - 1];
  return { kind: last.kind, from: last.from, to: last.to, t: 1 };
}
