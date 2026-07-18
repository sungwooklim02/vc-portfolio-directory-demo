import { t, type Locale } from "@/lib/i18n";
import { REPO_URL } from "@/lib/site";

export function Footer({ locale }: { locale: Locale }) {
  const s = t(locale);
  return (
    <footer className="border-t border-zinc-200 bg-zinc-100/60 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p data-demo-notice className="max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {s.footerNotice}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500 dark:text-zinc-500">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-zinc-400 underline-offset-2 transition-colors hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:hover:text-zinc-200"
          >
            {s.footerSource}
          </a>
          <span>{s.footerStack}</span>
        </div>
      </div>
    </footer>
  );
}
