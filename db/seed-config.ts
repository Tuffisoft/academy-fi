export class SeedConfigurationError extends Error {}

type SeedAccount = {
  name: string;
  email: string;
  password: string;
  role: "OWNER" | "INTERN";
  locale: "de" | "en";
};

export function getSeedConfiguration(env: Record<string, string | undefined> = process.env) {
  if (env.DATABASE_ENV !== "development" || env.NODE_ENV === "production")
    throw new SeedConfigurationError(
      "Seed benötigt DATABASE_ENV=development und darf nicht in Produktion laufen.",
    );
  try {
    const url = new URL(env.DATABASE_URL ?? "");
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length <= 1
    )
      throw new Error();
  } catch {
    throw new SeedConfigurationError(
      "DATABASE_URL muss auf die separate PostgreSQL-Entwicklungsdatenbank zeigen.",
    );
  }
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32)
    throw new SeedConfigurationError(
      "BETTER_AUTH_SECRET benötigt mindestens 32 Zeichen.",
    );
  const key = Buffer.from(env.CHAT_MASTER_KEY ?? "", "base64");
  const validKey =
    key.length === 32 && key.toString("base64") === env.CHAT_MASTER_KEY;
  key.fill(0);
  if (!validKey)
    throw new SeedConfigurationError(
      "CHAT_MASTER_KEY fehlt oder ist ungültig. Zuerst npm run chat:key:setup ausführen.",
    );
  if (env.SEED_CHAT_DEMO && !["true", "false"].includes(env.SEED_CHAT_DEMO))
    throw new SeedConfigurationError(
      "SEED_CHAT_DEMO muss true oder false sein.",
    );

  function account(
    prefix: string,
    defaults: { name: string; email: string },
    role: SeedAccount["role"],
    required = false,
  ): SeedAccount | null {
    const passwordVariable =
      role === "OWNER" ? "SEED_FI_PASSWORD" : `${prefix}_PASSWORD`;
    const password = env[passwordVariable];
    if (!password && !required) return null;
    if (!password || password.length < 8 || password.length > 128)
      throw new SeedConfigurationError(
        `${passwordVariable} benötigt 8 bis 128 Zeichen.`,
      );
    const locale = env[`${prefix}_LOCALE`] ?? "de";
    if (locale !== "de" && locale !== "en")
      throw new SeedConfigurationError(
        `${prefix}_LOCALE muss de oder en sein.`,
      );
    return {
      name: env[`${prefix}_NAME`]?.trim() || defaults.name,
      email: (env[`${prefix}_EMAIL`]?.trim() || defaults.email).toLowerCase(),
      password,
      role,
      locale,
    };
  }

  const accounts = [
    account(
      "SEED_OWNER",
      { name: "Calem", email: "calem@studio-fi.com" },
      "OWNER",
      true,
    ),
    account(
      "SEED_USER_1",
      { name: "Alex", email: "alex@example.com" },
      "INTERN",
    ),
    account("SEED_USER_2", { name: "Sam", email: "sam@example.com" }, "INTERN"),
  ].filter((value): value is SeedAccount => value !== null);
  const emails = new Set<string>();
  for (const row of accounts) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))
      throw new SeedConfigurationError(
        "Ein Seed-Konto hat keine gültige E-Mail-Adresse.",
      );
    if (emails.has(row.email))
      throw new SeedConfigurationError(
        "Jedes Seed-Konto benötigt eine eigene E-Mail-Adresse.",
      );
    emails.add(row.email);
  }
  return { accounts, seedChats: env.SEED_CHAT_DEMO !== "false" };
}
