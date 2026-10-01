"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface SchoolOption {
  id: string;
  name: string;
  slug: string;
}

interface SchoolComboboxProps {
  schools: SchoolOption[];
  selected: SchoolOption | null;
  onSelect: (school: SchoolOption | null) => void;
  invalid?: boolean;
}

/**
 * Searchable school picker over the existing verify-student-public school
 * list. Keyboard-accessible combobox (typeahead filter, arrow navigation,
 * Enter to select, Escape to close). No hardcoded data — the list is passed
 * in from the live edge-function fetch.
 */
export function SchoolCombobox({ schools, selected, onSelect, invalid }: SchoolComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return schools;
    return schools.filter((school) => school.name.toLowerCase().includes(needle));
  }, [schools, query]);

  // Close on outside interaction.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  // Keep the highlighted row visible while arrowing through the list.
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    listRef.current
      .querySelectorAll("li")
      .item(activeIndex)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  const openList = () => {
    setIsOpen(true);
    setActiveIndex(0);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    if (selected) onSelect(null); // typing again clears the prior selection
    setActiveIndex(0);
    setIsOpen(true);
  };

  const choose = (school: SchoolOption) => {
    onSelect(school);
    setQuery(school.name);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) openList();
      else setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (isOpen) setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      const school = filtered[activeIndex];
      if (school) choose(school);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="school-listbox"
          aria-autocomplete="list"
          aria-label="Your school"
          aria-invalid={invalid || undefined}
          type="text"
          value={selected ? selected.name : query}
          onChange={handleInputChange}
          onFocus={openList}
          onKeyDown={handleKeyDown}
          placeholder="Search — e.g. University of Nigeria"
          className={`flex h-10 w-full rounded-lg border bg-surface-50 px-3 text-sm text-foreground placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campus-500 ${
            invalid ? "border-red-700" : "border-surface-300"
          }`}
        />
        {selected && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-campus-400"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
        )}
      </div>

      {isOpen && (
        <ul
          ref={listRef}
          id="school-listbox"
          role="listbox"
          aria-label="Schools"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-surface-300 bg-surface-100 py-1 shadow-xl"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-slate-400" role="status">
              No school matches &ldquo;{query.trim()}&rdquo;. Check the spelling or pick the
              closest campus.
            </li>
          ) : (
            filtered.map((school, index) => {
              const isSelected = selected?.id === school.id;
              const isActive = index === activeIndex;
              return (
                <li
                  key={school.id}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()} // keep input focus
                  onClick={() => choose(school)}
                  className={`min-h-[40px] cursor-pointer px-3 py-2 text-sm ${
                    isSelected
                      ? "text-campus-400"
                      : isActive
                        ? "bg-surface-200 text-foreground"
                        : "text-slate-300"
                  }`}
                >
                  {school.name}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
