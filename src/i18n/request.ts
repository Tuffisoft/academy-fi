import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import deMessages from "../messages/de.json";
import enMessages from "../messages/en.json";

const messages = {
  de: deMessages,
  en: enMessages,
} satisfies Record<(typeof routing.locales)[number], typeof enMessages>;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: messages[locale],
  };
});
