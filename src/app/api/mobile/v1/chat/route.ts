import { chatList } from "@/lib/mobile/chat";
import { mobileRoute } from "@/lib/mobile/http";

/** The member's talks and group chats, newest activity first (/app/chat). */
export const GET = mobileRoute(({ user, locale }) => chatList(user, locale));
