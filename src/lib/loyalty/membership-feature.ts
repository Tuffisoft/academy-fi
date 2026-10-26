import "server-only";

export function membershipsEnabled() {
  return process.env.STEMPELFI_MEMBERS_ENABLED === "1" && ["development", "test"].includes(process.env.DATABASE_ENV ?? "");
}
