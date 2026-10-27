import assert from "node:assert/strict";
import { before, mock, test } from "node:test";
import { freeEntitlement, loyaltyPlans } from "../src/lib/loyalty/plans";

let user: { id: string; role: string; banned: boolean; email: string } | null;
let member: { id: string; role: string; status: string; organization: { status: string; entitlement: { plan: string } | null } } | null;
let detailReads = 0;
let slots = 1;
let writes = 0;
let locks = 0;
let portalQueries: unknown[] = [];
let searchRows: { id: string }[] = [];
let portalFound = false;
let auditFails = false;
const db = {
  user: { findUnique: async () => user },
  organizationMembership: {
    findUnique: async ({ where }: { where: { organizationId_userId: { userId: string } } }) => where.organizationId_userId.userId === "actor" ? member : null,
    count: async () => slots,
    upsert: async () => { writes++; return { id: "new-member" }; },
  },
  organization: {
    findUnique: async () => { detailReads++; return portalFound ? { id: "org", status: member?.organization.status, entitlement: member?.organization.entitlement } : { id: "org" }; },
    findMany: async (query: unknown) => { portalQueries.push(query); return searchRows; },
    findFirst: async (query: unknown) => { portalQueries.push(query); return portalFound ? { id: "org" } : null; },
  },
  organizationAuditLog: { create: async () => { if (auditFails) throw new Error("Audit unavailable"); writes++; } },
  organizationInvitation: { updateMany: async () => ({ count: 0 }), count: async () => 0, findFirst: async () => null },
  $queryRaw: async () => { locks++; return [{ now: new Date() }]; },
};
mock.module("../src/lib/prisma.ts", { namedExports: { prisma: { ...db, $transaction: async (operation: (tx: typeof db) => Promise<unknown>) => operation(db) } } });
let getOrganizationContext: typeof import("../src/lib/loyalty/organizations").getOrganizationContext;
let getInternalOrganizationDetail: typeof import("../src/lib/loyalty/organizations").getInternalOrganizationDetail;
let addStaffMembership: typeof import("../src/lib/loyalty/organizations").addStaffMembership;
let getPortalOrganizations: typeof import("../src/lib/loyalty/organizations").getPortalOrganizations;
let getPortalOrganization: typeof import("../src/lib/loyalty/organizations").getPortalOrganization;
let createOrganization: typeof import("../src/lib/loyalty/organizations").createOrganization;
let searchInternalOrganizations: typeof import("../src/lib/loyalty/organizations").searchInternalOrganizations;
before(async () => {
  ({ getOrganizationContext, getInternalOrganizationDetail, addStaffMembership, getPortalOrganizations, getPortalOrganization, createOrganization, searchInternalOrganizations } = await import("../src/lib/loyalty/organizations"));
});

function reset() {
  user = { id: "actor", role: "CUSTOMER", banned: false, email: "actor@example.invalid" };
  member = { id: "member", role: "OWNER", status: "ACTIVE", organization: { status: "ACTIVE", entitlement: { plan: "FREE" } } };
  slots = 1; writes = 0; locks = 0; portalQueries = [];
  searchRows = []; portalFound = false; auditFails = false;
}

test("internal search denies non-owners and stale identities before reading any companies", async () => {
  for (const role of ["INTERN", "CUSTOMER", "OWNER,INTERN", "ADMIN"]) {
    reset(); user!.role = role;
    await assert.rejects(searchInternalOrganizations("actor", { q: "foreign" }), /FORBIDDEN/);
    assert.equal(portalQueries.length, 0);
  }
  reset(); user!.role = "OWNER"; user!.banned = true;
  await assert.rejects(searchInternalOrganizations("actor"), /FORBIDDEN/);
  reset(); user = null;
  await assert.rejects(searchInternalOrganizations("actor"), /FORBIDDEN/);
  assert.equal(portalQueries.length, 0);
});

test("internal search validates boundaries and keeps the search filter on cursor pages", async () => {
  reset(); user!.role = "OWNER";
  for (const q of ["a".repeat(161), "A\nB", "A\u0000B"]) await assert.rejects(searchInternalOrganizations("actor", { q }), /INVALID_INPUT/);
  for (const after of ["", "../foreign", "a".repeat(161)]) await assert.rejects(searchInternalOrganizations("actor", { after }), /INVALID_INPUT/);
  assert.equal(portalQueries.length, 0);
  searchRows = Array.from({ length: 51 }, (_, i) => ({ id: `org-${i}` }));
  const result = await searchInternalOrganizations("actor", { q: "  Café  ", after: "org-10" });
  assert.equal(result.q, "Café"); assert.equal(result.organizations.length, 50); assert.equal(result.next, "org-49");
  assert.deepEqual(portalQueries[0], {
    where: { id: { gt: "org-10" }, OR: [{ id: "Café" }, { name: { contains: "Café", mode: "insensitive" } }] },
    select: { id: true, name: true, slug: true, status: true, entitlement: { select: { plan: true } } },
    orderBy: { id: "asc" }, take: 51,
  });
  searchRows = [];
  const empty = await searchInternalOrganizations("actor", { q: " " });
  assert.deepEqual(empty, { q: "", organizations: [], next: null });
});

test("portal basis without a tariff is readable by active roles while business writes remain denied", async () => {
  for (const role of ["OWNER", "ADMIN", "STAFF"]) {
    reset(); portalFound = true; member!.role = role; member!.organization.entitlement = null;
    const result = await getPortalOrganization("actor", "own-company");
    assert.equal(result.role, role); assert.equal(result.entitlement, null); assert.equal(result.internal, false);
    await assert.rejects(getOrganizationContext("actor", "org"), /FORBIDDEN/);
  }
});

test("portal reads recheck membership and status and reject manipulated roles or a revoked member", async () => {
  for (const role of ["OWNER,ADMIN", "", "INTERN"]) {
    reset(); portalFound = true; member!.role = role;
    await assert.rejects(getPortalOrganization("actor", "own-company"), /FORBIDDEN/);
  }
  reset(); portalFound = true; member!.status = "REVOKED";
  await assert.rejects(getPortalOrganization("actor", "own-company"), /FORBIDDEN/);
  reset(); portalFound = true; member!.organization.status = "SUSPENDED";
  await assert.rejects(getPortalOrganization("actor", "own-company"), /FORBIDDEN/);
});

test("internal detail refuses to return data when the audit write fails", async () => {
  reset(); user!.role = "OWNER"; auditFails = true;
  await assert.rejects(getInternalOrganizationDetail("actor", "org"), /Audit unavailable/);
  assert.equal(writes, 0);
});

test("central tariff profiles match contractual limits; unconfirmed paid rights fail closed", () => {
  assert.deepEqual(loyaltyPlans, { FREE: { programs: 1, users: 1, cards: 100 }, PRO: { programs: 5, users: 5, cards: 1000 }, BUSINESS: { programs: null, users: 20, cards: 10000 } });
  for (const value of ["PRO", "BUSINESS", "free", "OWNER", ""]) assert.throws(() => freeEntitlement(value));
});

test("tenant roles require a current identity and active membership, never a global role alone", async () => {
  reset();
  assert.equal((await getOrganizationContext("actor", "org")).kind, "member");
  for (const role of ["OWNER", "INTERN", "CUSTOMER"]) {
    reset(); user!.role = role; member = null;
    await assert.rejects(getOrganizationContext("actor", "foreign"), /FORBIDDEN/);
  }
  for (const role of ["OWNER,CUSTOMER", "ADMIN", "STAFF", ""]) {
    reset(); user!.role = role;
    await assert.rejects(getOrganizationContext("actor", "org"), /FORBIDDEN/);
  }
  reset(); user = null;
  await assert.rejects(getOrganizationContext("actor", "org"), /FORBIDDEN/);
  reset(); user!.banned = true;
  await assert.rejects(getOrganizationContext("actor", "org"), /FORBIDDEN/);
  reset(); member!.status = "REVOKED";
  await assert.rejects(getOrganizationContext("actor", "org"), /FORBIDDEN/);
  for (const status of ["PENDING", "SUSPENDED", "DELETING"]) {
    reset(); member!.organization.status = status;
    await assert.rejects(getOrganizationContext("actor", "org"), /FORBIDDEN/);
  }
  reset(); member!.organization.entitlement = null;
  await assert.rejects(getOrganizationContext("actor", "org"), /FORBIDDEN/);
  for (const value of ["", "../org", "x y", "a".repeat(161)]) {
    await assert.rejects(getOrganizationContext("actor", value), /INVALID_INPUT/);
  }
});

test("internal detail authorizes the DB global role before tenant data access", async () => {
  const initial = detailReads;
  for (const role of ["INTERN", "CUSTOMER", "OWNER,INTERN"]) {
    reset(); user!.role = role;
    await assert.rejects(getInternalOrganizationDetail("actor", "org"), /FORBIDDEN/);
  }
  assert.equal(detailReads, initial);
  reset(); user!.role = "OWNER";
  assert.deepEqual(await getInternalOrganizationDetail("actor", "org"), { id: "org" });
});

test("membership writes recheck rights under the lock and reject exhausted Free capacity before writing", async () => {
  reset();
  await assert.rejects(addStaffMembership("actor", "org", "target", "Test"), /LIMIT_REACHED/);
  assert.ok(locks >= 3); assert.equal(writes, 0);
  reset(); member!.role = "STAFF";
  await assert.rejects(addStaffMembership("actor", "org", "target", "Test"), /FORBIDDEN/);
  assert.equal(writes, 0);
  await assert.rejects(addStaffMembership("actor", "org", "target", " "), /INVALID_INPUT/);
});

test("portal selection scopes member queries to current active memberships; only a DB OWNER gets all", async () => {
  for (const role of ["INTERN", "CUSTOMER"]) {
    reset(); user!.role = role;
    const result = await getPortalOrganizations("actor");
    assert.equal(result.internal, false);
    assert.equal(result.canCreate, role === "INTERN");
    assert.deepEqual(portalQueries[0], { where: { status: "ACTIVE", memberships: { some: { userId: "actor", status: "ACTIVE", role: { in: ["OWNER", "ADMIN", "STAFF"] } } } }, select: { id: true, name: true, slug: true, status: true }, orderBy: { id: "asc" }, take: 51 });
    await assert.rejects(getPortalOrganization("actor", "foreign-company"), /FORBIDDEN/);
    assert.deepEqual(portalQueries[1], { where: { slug: "foreign-company", status: "ACTIVE", memberships: { some: { userId: "actor", status: "ACTIVE", role: { in: ["OWNER", "ADMIN", "STAFF"] } } } }, select: { id: true, name: true, slug: true, status: true } });
  }
  reset(); user!.role = "OWNER";
  assert.equal((await getPortalOrganizations("actor", "cursor")).internal, true);
  assert.deepEqual(portalQueries[0], { where: { id: { gt: "cursor" } }, select: { id: true, name: true, slug: true, status: true }, orderBy: { id: "asc" }, take: 51 });
  for (const invalid of [null, { id: "actor", role: "OWNER,INTERN", banned: false, email: "actor@example.invalid" }, { id: "actor", role: "OWNER", banned: true, email: "actor@example.invalid" }]) {
    reset(); user = invalid;
    await assert.rejects(getPortalOrganizations("actor"), /FORBIDDEN/);
    assert.equal(portalQueries.length, 0);
  }
});

test("company creation denies other account types, revoked identities and manipulated input before writes", async () => {
  const operation = "12345678-1234-4567-8123-123456789abc";
  for (const role of ["OWNER", "CUSTOMER", "OWNER,INTERN", "ADMIN"]) {
    reset(); user!.role = role;
    await assert.rejects(createOrganization("actor", "Business", operation), /FORBIDDEN/);
    assert.equal(writes, 0);
  }
  reset(); user!.role = "INTERN"; user!.banned = true;
  await assert.rejects(createOrganization("actor", "Business", operation), /FORBIDDEN/);
  reset(); user!.role = "INTERN";
  for (const name of ["", " ", "a".repeat(161), "A\nB"]) await assert.rejects(createOrganization("actor", name, operation), /INVALID_INPUT/);
  await assert.rejects(createOrganization("actor", "Business", "foreign/id"), /INVALID_INPUT/);
  assert.equal(writes, 0);
});
