import { getTranslations } from "next-intl/server";
import { MemberCard } from "@/components/directory/member-card";
import { EmptyState } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SearchForm } from "@/components/ui/search-form";
import { SearchButton } from "@/components/ui/submit-button";
import type { Direction, FamilyCandidate } from "@/lib/family";
import { ClaimButton } from "./claim-button";

/** GET search form + results for claiming a child or parent. */
export async function FamilySearch({
  direction,
  param,
  q,
  results,
  otherParams,
}: {
  direction: Direction;
  /** searchParams key for this form's query */
  param: string;
  q: string;
  results: FamilyCandidate[] | null;
  /** keep the other form's query when submitting this one */
  otherParams: Record<string, string>;
}) {
  const t = await getTranslations("family");
  const ns = direction === "child" ? "claimChild" : "claimParent";
  return (
    <div className="space-y-4">
      <search>
        {/* back to this form after searching */}
        <SearchForm className="space-y-3" action={`#${param}`} scroll>
          {Object.entries(otherParams).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <Field
            id={param}
            label={t(`${ns}.searchLabel`)}
            hint={direction === "child" ? t("claimChild.minorHint") : undefined}
          >
            {(a) => (
              <Input
                {...a}
                type="search"
                name={param}
                defaultValue={q}
                minLength={2}
                maxLength={100}
                autoComplete="off"
              />
            )}
          </Field>
          <SearchButton variant="secondary">{t("search")}</SearchButton>
        </SearchForm>
      </search>
      {results === null ? null : results.length === 0 ? (
        <div data-results>
          <EmptyState>{t("noResults")}</EmptyState>
        </div>
      ) : (
        <ul data-results className="space-y-3">
          {results.map((c) => (
            <li key={c.id}>
              <MemberCard
                member={c}
                linked={!c.limited}
                showPhoto={!c.limited}
                actions={<ClaimButton otherId={c.id} direction={direction} />}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
