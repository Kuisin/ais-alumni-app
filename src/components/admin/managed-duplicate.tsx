import { TriangleAlert } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { mergeManagedIntoApplicantAction } from "@/app/actions/admin-verify";
import { SubmitButton } from "@/components/ui/submit-button";
import { Link } from "@/i18n/navigation";
import { displayName } from "@/lib/format";
import { findManagedMatches } from "@/lib/parent-onboarding";

/**
 * Warns when a self-registering applicant matches a child account a parent
 * already created (same name + birth date), with a one-click merge that
 * keeps the applicant's own account.
 */
export async function ManagedDuplicate({
  requestId,
  applicant,
}: {
  requestId: string;
  applicant: {
    id: string;
    nameRomaji: string | null;
    nameKanji: string | null;
    nameAtAis: string | null;
    dateOfBirth: Date | null;
  };
}) {
  const matches = await findManagedMatches(
    {
      names: [applicant.nameRomaji, applicant.nameKanji, applicant.nameAtAis],
      dateOfBirth: applicant.dateOfBirth,
    },
    applicant.id,
  );
  if (matches.length === 0) return null;
  const t = await getTranslations("adminVerify.managedDuplicate");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  return (
    <section
      aria-labelledby="managed-dup-title"
      className="space-y-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4"
    >
      <h2
        id="managed-dup-title"
        className="flex items-center gap-2 font-semibold text-amber-900"
      >
        <TriangleAlert aria-hidden="true" className="size-5" />
        {t("title")}
      </h2>
      <p className="text-sm text-amber-900">{t("body")}</p>
      <ul className="space-y-2">
        {matches.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 text-sm"
          >
            <span>
              <Link
                href={`/app/admin/members/${m.id}`}
                className="font-medium text-brand-700 hover:underline"
              >
                {displayName(m, locale)}
              </Link>
              <span className="block text-slate-600">
                {t("registeredBy", {
                  parent: m.managedBy ? displayName(m.managedBy, locale) : "—",
                })}
              </span>
            </span>
            <form action={mergeManagedIntoApplicantAction}>
              <input type="hidden" name="requestId" value={requestId} />
              <input type="hidden" name="managedId" value={m.id} />
              <SubmitButton variant="secondary" className="px-3 text-xs">
                {t("merge")}
              </SubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
