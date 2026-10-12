/**
 * Inline, render-blocking bootstrap — runs before paint (FOUC guard).
 * 1. Theme: localStorage choice wins; falls back to prefers-color-scheme.
 * 2. Motion floor: ?capture=1 -> body.capture-mode (+ html.capture-mode for View Transition
 *    pseudo-elements). With capture-mode or prefers-reduced-motion nothing is pre-hidden.
 * 3. Only when motion is on: html.mk-on (motion-only CSS) and html.mk-boot, which pre-hides the
 *    entry-choreography targets until MotionRuntime starts their animations (it always removes
 *    mk-boot; a 3s failsafe removes it here too if the app bundle never runs).
 * 4. Cross-document View Transitions (language switch) are skipped in capture / reduced motion.
 */
const code = `(function(){try{var s=localStorage.getItem("vpd-theme");var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;var c=document.documentElement.classList;if(d){c.add("dark")}else{c.remove("dark")}}catch(e){}
try{var h=document.documentElement,cap=new URLSearchParams(location.search).get("capture")==="1",rm=matchMedia("(prefers-reduced-motion: reduce)").matches;
if(cap){h.classList.add("capture-mode");if(document.body)document.body.classList.add("capture-mode")}
if(cap||rm){addEventListener("pagereveal",function(e){if(e.viewTransition)e.viewTransition.skipTransition()})}
else{h.classList.add("mk-on","mk-boot");setTimeout(function(){h.classList.remove("mk-boot")},3000)}}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
