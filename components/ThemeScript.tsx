/**
 * Inline, render-blocking theme bootstrap — runs before paint (FOUC guard).
 * localStorage choice wins; falls back to prefers-color-scheme.
 */
const code = `(function(){try{var s=localStorage.getItem("vpd-theme");var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;var c=document.documentElement.classList;if(d){c.add("dark")}else{c.remove("dark")}}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
