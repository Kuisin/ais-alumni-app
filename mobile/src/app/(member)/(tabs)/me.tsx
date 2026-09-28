import { useRouter } from "expo-router";
import { LogOut, ShieldCheck } from "lucide-react-native";
import { useTranslations } from "use-intl";
import { useAuth, useMe } from "@/lib/auth";
import { webHref } from "@/lib/links";
import {
  Avatar,
  colors,
  ListGroup,
  ListRow,
  Screen,
  Separator,
  Text,
} from "@/ui";

// Placeholder — replaced by the me/settings feature.
export default function MeTab() {
  const t = useTranslations("common");
  const router = useRouter();
  const me = useMe();
  const { signOut } = useAuth();
  const staff = Object.values(me.access).some(Boolean);
  return (
    <Screen>
      <ListGroup>
        <ListRow
          leading={<Avatar uri={me.user.avatar} size={48} />}
          title={me.user.name}
          subtitle={me.user.otherName ?? me.user.email}
          onPress={() => router.push(webHref("/app/profile"))}
        />
      </ListGroup>
      <ListGroup>
        {staff ? (
          <>
            <ListRow
              leading={<ShieldCheck color={colors.slate600} size={20} />}
              title={t("nav.adminMode")}
              onPress={() => router.push(webHref("/app/admin"))}
            />
            <Separator />
          </>
        ) : null}
        <ListRow
          leading={<LogOut color={colors.red700} size={20} />}
          title={t("signOut")}
          destructive
          chevron={false}
          onPress={signOut}
        />
      </ListGroup>
      <Text variant="caption" tone="subtle" center>
        {t("footer")}
      </Text>
    </Screen>
  );
}
