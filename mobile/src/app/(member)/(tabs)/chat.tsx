import { useTranslations } from "use-intl";
import { EmptyState, Screen } from "@/ui";

// Placeholder — replaced by the chat feature.
export default function Placeholder() {
  const t = useTranslations("common");
  return (
    <Screen>
      <EmptyState title={t("notReady")} />
    </Screen>
  );
}
