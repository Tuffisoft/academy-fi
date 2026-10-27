import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { before, mock, test } from "node:test";
import { isValidElement, type ReactNode } from "react";

let locale = "de";
let owner = true;
let fail: "database" | "audit" | null = null;
let searchCalls = 0;
let matches = true;
let feature = true;
const organization = { id: "org-1", slug: "own-company", name: "Real business", status: "ACTIVE", entitlement: null, _count: { memberships: 2 } };
class AccessError extends Error { constructor(public code: string) { super(code); } }
mock.module("../src/lib/session.ts", { namedExports: { requirePlatformOwner: async () => { if (!owner) throw new Error("DENIED"); return { id: "session-owner" }; } } });
mock.module("next/navigation", { namedExports: { notFound: () => { throw new Error("NOT_FOUND"); } } });
mock.module("next-intl/server", { namedExports: { getTranslations: async (namespace: string) => {
  const dictionary: unknown = JSON.parse(readFileSync(`src/messages/${locale}.json`, "utf8"));
  return (key: string) => {
    let current: unknown = dictionary;
    for (const part of `${namespace}.${key}`.split(".")) {
      assert.ok(current && typeof current === "object" && part in current, `Missing ${locale} message: ${namespace}.${key}`);
      current = (current as Record<string, unknown>)[part];
    }
    assert.equal(typeof current, "string");
    return current as string;
  };
} } });
const children = ({ children }: { children?: ReactNode }) => children;
mock.module("../src/i18n/navigation.ts", { namedExports: { Link: children, redirect: ({ href }: { href: string }) => { throw new Error(`REDIRECT:${href}`); } } });
mock.module("../src/components/ui/badge.tsx", { namedExports: { Badge: children } });
mock.module("../src/lib/loyalty/membership-feature.ts", { namedExports: { membershipsEnabled: () => feature } });
mock.module("../src/lib/loyalty/organizations.ts", { namedExports: {
  OrganizationAccessError: AccessError,
  searchInternalOrganizations: async (actor: string, query: { q?: string; after?: string }) => {
    searchCalls++; assert.equal(actor, "session-owner");
    if (fail) throw new Error("Database unavailable");
    if (query.q === "invalid") throw new AccessError("INVALID_INPUT");
    return { q: query.q ?? "", organizations: matches ? [organization] : [], next: matches ? "org-50" : null };
  },
  getInternalOrganizationDetail: async (actor: string) => {
    assert.equal(actor, "session-owner");
    if (fail) throw new Error("Audit unavailable");
    return organization;
  },
} });

// Inspect rendered server-component elements; this is not a browser/device test.
function elements(value: ReactNode): { type: unknown; props: Record<string, unknown> }[] {
  if (Array.isArray(value)) return value.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [{ type: value.type, props: value.props }, ...elements(value.props.children as ReactNode)];
}
function text(value: ReactNode): string {
  if (Array.isArray(value)) return value.map(text).join(" ");
  if (isValidElement<{ children?: ReactNode }>(value)) return text(value.props.children);
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
let SearchPage: typeof import("../src/app/[locale]/tools/calem/stempelkarten/admin/page").default;
let DetailPage: typeof import("../src/app/[locale]/tools/calem/stempelkarten/admin/[organizationId]/page").default;
let Navigation: typeof import("../src/components/loyalty/portal-navigation").PortalNavigation;
before(async () => {
  SearchPage = (await import("../src/app/[locale]/tools/calem/stempelkarten/admin/page")).default;
  DetailPage = (await import("../src/app/[locale]/tools/calem/stempelkarten/admin/[organizationId]/page")).default;
  Navigation = (await import("../src/components/loyalty/portal-navigation")).PortalNavigation;
});
const search = (query: { q?: string | string[]; after?: string | string[] } = {}) => SearchPage({ params: Promise.resolve({ locale }), searchParams: Promise.resolve(query) });

test("workspace navigation reflects role, feature switch and active page in DE/EN", async () => {
  for (locale of ["de", "en"]) {
    feature = true;
    for (const role of ["OWNER", "ADMIN", "STAFF"] as const) {
      const view = await Navigation({ slug: "own-company", role, internal: false, active: "members" });
      const links = elements(view).filter(el => typeof el.props.href === "string");
      assert.equal(links.some(el => String(el.props.href).endsWith("/members")), role !== "STAFF");
      assert.equal(text(view).includes(locale === "de" ? "Abrechnung" : "Billing"), role === "OWNER");
      assert.ok(text(view).includes(locale === "de" ? "Noch nicht verfügbar" : "Not available yet"));
      if (role !== "STAFF") assert.equal(links.find(el => String(el.props.href).endsWith("/members"))?.props["aria-current"], "page");
    }
    feature = false;
    assert.equal(elements(await Navigation({ slug: "own-company", role: "OWNER", internal: false })).filter(el => String(el.props.href).endsWith("/members")).length, 0);
    assert.ok(!text(await Navigation({ slug: "own-company", role: null, internal: true })).includes(locale === "de" ? "Noch nicht verfügbar" : "Not available yet"));
  }
});

test("direct internal search rejects non-owners and duplicate parameters before search I/O", async () => {
  owner = false; searchCalls = 0;
  await assert.rejects(search({ q: "private" }), /DENIED/);
  assert.equal(searchCalls, 0);
  owner = true; fail = null;
  for (const query of [{ q: ["a", "b"] }, { after: ["one", "two"] }]) {
    const view = await search(query);
    assert.ok(elements(view).some(el => el.props.role === "alert"));
  }
  assert.equal(searchCalls, 0);
});

test("internal search renders real data, carries query through pagination and separates empty/error states", async () => {
  owner = true; fail = null; matches = true;
  for (locale of ["de", "en"]) {
    const view = await search({ q: "Real business" });
    assert.ok(text(view).includes(organization.name));
    assert.ok(text(view).includes(locale === "de" ? "Nicht eingerichtet" : "Not configured"));
    const next = elements(view).find(el => String(el.props.href).includes("after=org-50"));
    assert.ok(next); assert.ok(String(next.props.href).includes("q=Real+business"));
    assert.equal(elements(view).find(el => String(el.props.href).includes("/admin/org-1?"))?.props.prefetch, false);
    matches = false;
    assert.ok(elements(await search()).some(el => el.props.role === "status"));
    fail = "database";
    const error = await search();
    assert.ok(elements(error).some(el => el.props.role === "alert"));
    assert.ok(!text(error).includes(organization.name));
    assert.ok(!text(error).includes(locale === "de" ? "Keine passenden" : "No matching"));
    fail = null; matches = true;
  }
});

test("support details display explicit context and retain return search; audit failure reveals no company data", async () => {
  owner = true;
  for (locale of ["de", "en"]) {
    const args = { params: Promise.resolve({ locale, organizationId: "org-1" }), searchParams: Promise.resolve({ q: "Real", after: "org-0" }) };
    fail = null;
    const view = await DetailPage(args);
    assert.ok(text(view).includes(locale === "de" ? "Interner Support" : "Internal support"));
    assert.ok(elements(view).some(el => String(el.props.href).includes("q=Real&after=org-0")));
    fail = "audit";
    const error = await DetailPage(args);
    assert.ok(elements(error).some(el => el.props.role === "alert"));
    assert.ok(!text(error).includes(organization.name));
  }
  fail = null;
});
