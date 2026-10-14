import { withBase } from "./site";
export { VENDOR } from "./vendor.generated";

/**
 * Inject a same-origin vendor bundle (public/vendor/*.min.js, an IIFE that defines a global) once and
 * resolve with that global. Rejects on network/parse failure so the caller can show its fallback view.
 * Nothing here ever loads from another origin (runtime external requests: 0).
 */
const pending = new Map<string, Promise<unknown>>();

export function loadVendor<T>(file: string, globalName: string): Promise<T> {
  const w = window as unknown as Record<string, unknown>;
  if (w[globalName]) return Promise.resolve(w[globalName] as T);
  const src = withBase(`/vendor/${file}`);
  let p = pending.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => (w[globalName] ? resolve(w[globalName]) : reject(new Error(`${globalName} missing after load`)));
      s.onerror = () => {
        pending.delete(src);
        s.remove();
        reject(new Error(`failed to load ${src}`));
      };
      document.head.appendChild(s);
    });
    pending.set(src, p);
  }
  return p as Promise<T>;
}

