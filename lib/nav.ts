import { withBase } from "./site";

/**
 * Navigate to an in-site path ("/companies/x/", "/ko/") from code (search option, 3D dot, map list),
 * through the same route as a clicked link: MotionRuntime intercepts the click and runs the View
 * Transition when motion is on; otherwise the router pushes directly (no full reload).
 */
export function goTo(path: string, push: (p: string) => void): void {
  const a = document.createElement("a");
  a.href = withBase(path);
  a.hidden = true;
  a.addEventListener("click", (e) => {
    if (e.defaultPrevented) return;
    e.preventDefault();
    push(path);
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const slash = (p: string) => (p.endsWith("/") ? p : p + "/");
/**
 * True when the previous in-app route (recorded by MotionRuntime) is `path`: going back in history then
 * returns to that page exactly as it was left (filters, search, scroll position).
 */
export function cameFrom(path: string): boolean {
  const prev = (window as Window & { __vpdPrevPath?: string }).__vpdPrevPath;
  return !!prev && slash(prev) === slash(path) && window.history.length > 1;
}
