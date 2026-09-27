"use client";

import { useEffect, useRef } from "react";

/**
 * Inside a scrolling tab row: keeps the current tab in view on phones
 * (scrolls the row, never the page).
 */
export function KeepActiveTabVisible() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const row = ref.current?.parentElement;
    const active = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !active || row.scrollWidth <= row.clientWidth) return;
    const offset =
      active.getBoundingClientRect().left - row.getBoundingClientRect().left;
    row.scrollLeft += offset - (row.clientWidth - active.offsetWidth) / 2;
  });
  return <span ref={ref} hidden />;
}
