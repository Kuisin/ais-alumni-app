import Form from "next/form";
import type { ComponentProps } from "react";

/**
 * GET search / filter form. Without JavaScript it is a plain GET form
 * (§10.1); with it, submitting is a client-side navigation to the same page
 * with the new search params, keeping the shell and scroll position. While
 * the results load, its SearchButton spins and the page's [data-results]
 * regions dim (globals.css).
 */
export function SearchForm({
  action = "",
  scroll = false,
  ...props
}: Omit<ComponentProps<typeof Form>, "action"> & {
  /** "" (this page) or "#anchor" to return to the form */
  action?: string;
}) {
  // Same route: loading.tsx doesn't apply, so there is nothing to prefetch.
  return <Form action={action} scroll={scroll} prefetch={false} {...props} />;
}
