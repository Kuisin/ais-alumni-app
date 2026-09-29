import { mobileRoute } from "@/lib/mobile/http";
import { directoryOptions } from "@/lib/mobile/people";

/** The directory filter choices (contract: DirectoryOptions). */
export const GET = mobileRoute(({ locale }) => directoryOptions(locale));
