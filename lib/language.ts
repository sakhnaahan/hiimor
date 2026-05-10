import "server-only";

import { cookies } from "next/headers";
import { LANGUAGE_COOKIE_NAME, normalizeLanguage } from "@/lib/i18n";

export async function getCurrentLanguage() {
  const cookieStore = await cookies();
  return normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_NAME)?.value);
}
