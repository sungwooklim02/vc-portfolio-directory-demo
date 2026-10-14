"use client";

/**
 * Directory search as a WAI-ARIA combobox: live filtering of the grid/map, a list of up to 6 matching
 * companies (arrow keys, Enter opens, Esc closes then clears), match highlighting, a clear button, the "/"
 * shortcut, and "did you mean" / closest-company help when nothing matches.
 * The fuzzy/Hangul libraries are loaded by the parent on first focus; until then the parent filters with a
 * plain substring match, so typing is never lost or delayed.
 */
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Icon, Icons, SectorIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { t, type Locale } from "@/lib/i18n";
import { mk } from "@/lib/mk";
import { goTo } from "@/lib/nav";
import { Highlight } from "./Highlight";

export interface SearchOption {
  slug: string;
  name: string;
  koName?: string;
  sector: string;
  sectorLabel: string;
  city: string;
  marks?: { name?: Array<[number, number]>; koName?: Array<[number, number]> };
}
export interface SearchHelp {
  kind: "qwerty" | "closest";
  query: string;
  slug: string;
  label: string;
}

interface Props {
  locale: Locale;
  value: string;
  onChange: (q: string) => void;
  onFirstUse: () => void;
  options: SearchOption[];
  help: SearchHelp | null;
  /** ready-made "did you mean …?" / "closest company: …" line (built by the parent) */
  helpLabel: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SearchBox({ locale, value, onChange, onFirstUse, options, help, helpLabel, inputRef }: Props) {
  const s = t(locale);
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const ownRef = useRef<HTMLInputElement>(null);
  const input = inputRef ?? ownRef;
  const listRef = useRef<HTMLDivElement>(null);
  const placeRef = useRef<(() => void) | null>(null);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(-1);
  const shown = options.slice(0, 6);
  const hasQuery = value.trim().length > 0;
  const open = focused && hasQuery && !dismissed;
  const used = useRef(false);

  const first = () => {
    if (used.current) return;
    used.current = true;
    onFirstUse();
  };

  // "/" focuses the search box (not while typing in another field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [input]);

  // the list opens and closes with motion; the active row's highlight glides between rows
  useLayoutEffect(() => {
    if (open && listRef.current) mk()?.overlayIn(listRef.current, "pop");
  }, [open]);
  // the gliding highlight exists only while the option list is on screen (an empty result has no list)
  const hasOptions = shown.length > 0;
  useLayoutEffect(() => {
    const M = mk();
    const pop = listRef.current;
    const ul = pop?.querySelector(".vpd-sb-options");
    if (!open || !pop || !ul || !M || M.off()) return;
    pop.classList.add("has-ind");
    placeRef.current = M.indicator(ul, '[aria-selected="true"]');
    return () => {
      placeRef.current = null;
      pop.classList.remove("has-ind");
      ul.querySelector(":scope > .mk-indicator")?.remove();
    };
  }, [open, hasOptions]);
  useLayoutEffect(() => {
    placeRef.current?.();
  }, [active, shown.length]);
  useEffect(() => {
    setActive(-1);
  }, [value]);

  const openCompany = (slug: string) => {
    setDismissed(true);
    goTo(locale === "en" ? `/companies/${slug}/` : `/ko/companies/${slug}/`, (p) => router.push(p));
  };
  const clear = () => {
    onChange("");
    setDismissed(false);
    input.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!shown.length) return;
      e.preventDefault();
      setDismissed(false);
      const d = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => {
        const next = a + d;
        return next >= shown.length ? -1 : next < -1 ? shown.length - 1 : next;
      });
      return;
    }
    if (e.key === "Enter") {
      if (open && active >= 0 && shown[active]) {
        e.preventDefault();
        openCompany(shown[active].slug);
      } else if (open) {
        e.preventDefault();
        setDismissed(true); // keep the filter, close the list
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (open) {
        const el = listRef.current;
        const M = mk();
        if (M && el) M.overlayOut(el, "pop", () => setDismissed(true));
        else setDismissed(true);
      } else if (value) clear();
    }
  };

  const optId = (i: number) => `${id}-opt-${i}`;
  return (
    <div className="vpd-sb" data-open={open || undefined}>
      <label className="vpd-sb-field">
        <span className="sr-only">{s.searchLabel}</span>
        <Icon icon={Icons.search} className="vpd-sb-icon" />
        <input
          ref={input}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open && shown.length ? listId : undefined}
          aria-activedescendant={open && active >= 0 ? optId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={s.searchPlaceholder}
          onFocus={() => {
            first();
            setFocused(true);
            setDismissed(false);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            first();
            onKeyDown(e);
          }}
          onChange={(e) => {
            setDismissed(false);
            onChange(e.target.value);
          }}
        />
        {value ? (
          <button type="button" className="vpd-sb-clear" aria-label={s.searchClear} title={s.searchClear} onMouseDown={(e) => e.preventDefault()} onClick={clear}>
            <Icon icon={Icons.x} />
          </button>
        ) : (
          <kbd className="vpd-sb-kbd" aria-hidden="true" title={s.searchShortcut}>
            /
          </kbd>
        )}
      </label>
      {open && (
        <div ref={listRef} className="vpd-sb-pop">
          {shown.length > 0 ? (
            <>
              <p className="vpd-sb-head">{s.searchSuggestions}</p>
              <ul id={listId} role="listbox" aria-label={s.searchSuggestions} className="vpd-sb-options">
                {shown.map((o, i) => (
                  <li
                    key={o.slug}
                    id={optId(i)}
                    role="option"
                    aria-selected={i === active}
                    className="vpd-sb-option"
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => openCompany(o.slug)}
                  >
                    <span className="vpd-sb-logo">
                      <Logo slug={o.slug} name={o.name} className="max-h-5 max-w-6" />
                    </span>
                    <span className="vpd-sb-text">
                      <span className="vpd-sb-name">
                        <Highlight text={o.name} ranges={o.marks?.name} />
                        {o.koName && (
                          <span className="vpd-sb-ko">
                            {" "}
                            <Highlight text={o.koName} ranges={o.marks?.koName} />
                          </span>
                        )}
                      </span>
                      <span className="vpd-sb-meta">
                        <SectorIcon id={o.sector} />
                        {o.sectorLabel} · {o.city}
                      </span>
                    </span>
                    <Icon icon={Icons.enter} className="vpd-sb-enter" />
                  </li>
                ))}
              </ul>
              <p className="vpd-sb-keys" aria-hidden="true">
                {s.searchKeysHint}
              </p>
            </>
          ) : (
            <div className="vpd-sb-empty" role="status">
              <p>{s.searchNoMatch}</p>
              {help && (
                <button
                  type="button"
                  className="vpd-sb-help"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => (help.kind === "qwerty" ? onChange(help.query) : openCompany(help.slug))}
                >
                  {helpLabel}
                  <Icon icon={help.kind === "qwerty" ? Icons.search : Icons.arrowUpRight} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
