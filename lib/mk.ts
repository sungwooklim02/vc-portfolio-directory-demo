/**
 * Typed accessor for the shared motion kit (public/mk/motion-kit.js, loaded as a classic
 * script by the root layouts). Every helper already honors floor 1: with
 * prefers-reduced-motion: reduce or body.capture-mode it jumps to the final state.
 * Returns null on the server or if the kit failed to load — callers must then do the plain
 * (non-animated) state change.
 */
type Targets = Element | ArrayLike<Element> | string | null;

export interface MotionKit {
  off(): boolean;
  ms(token: string): number;
  EASE: Record<"out" | "inOut" | "spring" | "expo" | "in", string>;
  anim(el: Element | null, frames: Keyframe[], opts?: KeyframeAnimationOptions): Animation | null;
  stop(el: Element | null): void;
  enter(targets: Targets, opts?: { y?: number; scale?: number; delay?: number; dur?: number; step?: number; max?: number; blur?: number }): Promise<unknown>;
  overlayIn(el: Element | null, kind?: "pop" | "sheet" | "drawer" | "fade", backdrop?: Element | null): Promise<unknown>;
  overlayOut(el: Element | null, kind: "pop" | "sheet" | "drawer" | "fade", hide?: () => void, backdrop?: Element | null): Promise<unknown>;
  countAll(scope?: ParentNode): Promise<unknown>;
  flip(container: Element | null, mutate: () => void, key?: (el: Element) => string | null): Promise<unknown>;
  draw(targets: Targets, opts?: { dur?: number; step?: number; delay?: number }): Promise<unknown>;
  pop(el: Element | null): Promise<unknown>;
  shake(el: Element | null): Promise<unknown>;
  ripple(selector: string, scope?: ParentNode): void;
  indicator(list: Element | null, selectedSel?: string): () => void;
  reveal(targets: Targets, opts?: { y?: number }): void;
  loop(target: Element | null, frame: (t: number, still: boolean) => void): () => void;
}

export function mk(): MotionKit | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { MK?: MotionKit }).MK) ?? null;
}

/** True when motion must be skipped (kit missing, reduced motion, or capture-mode). */
export function motionOff(): boolean {
  const M = mk();
  return !M || M.off();
}
