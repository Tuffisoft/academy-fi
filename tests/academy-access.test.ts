import assert from "node:assert/strict";
import { after, before, mock, test } from "node:test";
import { NextRequest } from "next/server";

let session: { user: { id: string; role: string; name: string } } | null = null;
let currentUser: { id: string; role: string; banned: boolean } | null = null;
let locale = "de";
let businessCalls = 0;
const originals: Array<{ target: object; name: string; value: unknown }> = [];
function replace(target: object, name: string, replacement: unknown) {
  originals.push({ target, name, value: Reflect.get(target, name) });
  Reflect.set(target, name, replacement);
}

mock.module("next/headers", { namedExports: { headers: async () => new Headers() } });
mock.module("next/navigation", { namedExports: { notFound: () => { throw new Error("not-found:404"); } } });
mock.module("next-intl/server", { namedExports: { getLocale: async () => locale } });
mock.module("../src/lib/auth.ts", { namedExports: { auth: { api: { getSession: async () => session } } } });
mock.module("../src/i18n/navigation.ts", { namedExports: {
  redirect: ({ href }: { href: string }) => { throw new Error(`redirect:${href}`); },
} });

let getAcademyApiAccess: typeof import("../src/lib/session").getAcademyApiAccess;
let requireAcademyUser: typeof import("../src/lib/session").requireAcademyUser;
let requirePlatformOwner: typeof import("../src/lib/session").requirePlatformOwner;
let getAcademyIdentity: typeof import("../src/lib/academy-access").getAcademyIdentity;
before(async () => {
  const { prisma } = await import("../src/lib/prisma");
  ({ getAcademyApiAccess, requireAcademyUser, requirePlatformOwner } = await import("../src/lib/session"));
  ({ getAcademyIdentity } = await import("../src/lib/academy-access"));
  replace(prisma.user, "findUnique", async () => currentUser);
  for (const name of ["user", "weeklyAssignment", "assignmentChecklistItem", "taskStage", "reflection", "mentorFeedback", "department", "departmentResource", "discussionNote", "idea", "ideaNote", "dailyPlan", "dailyPlanStage", "leadSearch", "savedLead", "websiteAudit", "pdfReportDesign", "pdfReportTemplate", "chatMessage", "chatMembership", "directConversation", "friendship", "groupConversation", "groupMembership", "groupMessage"]) {
    const model: object = Reflect.get(prisma, name);
    for (const method of ["findUnique", "findFirst", "findMany", "create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany", "count"]) {
      if (name === "user" && method === "findUnique") continue;
      replace(model, method, async () => { businessCalls++; throw new Error("Unexpected business database access"); });
    }
  }
  replace(prisma, "$transaction", async () => { businessCalls++; throw new Error("Unexpected transaction"); });
});

test("all five internal HTTP handlers reject missing sessions, external users and revoked rights before business I/O", async () => {
  const chat = await import("../src/app/api/chat/route");
  const realtime = await import("../src/app/api/realtime/token/route");
  const searches = await import("../src/app/api/lead-searches/status/route");
  const preview = await import("../src/app/api/pdf-design/preview/route");
  const pdf = await import("../src/app/api/website-audits/[id]/pdf/route");
  const handlers = [
    () => chat.GET(new NextRequest("http://localhost/api/chat?conversationId=foreign")),
    () => realtime.POST(),
    () => searches.GET(),
    () => preview.POST(new Request("http://localhost/api/pdf-design/preview", { method: "POST" })),
    () => pdf.GET(new Request("http://localhost/api/website-audits/foreign/pdf"), { params: Promise.resolve({ id: "foreign" }) }),
  ];
  const beforeCalls = businessCalls;
  for (const role of [null, "CUSTOMER", "OWNER,INTERN", "banned", "deleted"]) {
    session = role === null ? null : { user: { id: "actor", role: "OWNER", name: "Actor" } };
    currentUser = role === "deleted" ? null : { id: "actor", role: role === "banned" ? "OWNER" : role ?? "INTERN", banned: role === "banned" };
    for (const handler of handlers) {
      const response = await handler();
      assert.equal(response.status, role === null ? 401 : 403);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    }
  }
  assert.equal(businessCalls, beforeCalls);
});

test("direct internal server actions reject external and revoked identities even with foreign or missing arguments", async (t) => {
  const modules = [
    await import("../src/lib/actions/assignments.actions"),
    await import("../src/lib/actions/daily-plans.actions"),
    await import("../src/lib/actions/departments.actions"),
    await import("../src/lib/actions/discussion-notes.actions"),
    await import("../src/lib/actions/ideas.actions"),
    await import("../src/lib/actions/users.actions"),
    await import("../src/lib/actions/lead-searches.actions"),
    await import("../src/lib/actions/saved-leads.actions"),
    await import("../src/lib/actions/website-audits.actions"),
    await import("../src/lib/actions/pdf-design.actions"),
    await import("../src/lib/actions/audit-controls.actions"),
    await import("../src/lib/chat/actions/message.actions"),
    await import("../src/lib/chat/actions/conversation.actions"),
    await import("../src/lib/chat/actions/group.actions"),
    await import("../src/lib/chat/actions/friend.actions"),
  ];
  const beforeCalls = businessCalls;
  let checked = 0;
  for (const role of [null, "CUSTOMER", "banned", "deleted"]) {
    session = role === null ? null : { user: { id: "actor", role: "OWNER", name: "Actor" } };
    currentUser = role === "deleted" ? null : { id: "actor", role: role === "banned" ? "OWNER" : role ?? "INTERN", banned: role === "banned" };
    for (const actions of modules) {
      for (const [name, action] of Object.entries(actions)) {
        if (typeof action !== "function") continue;
        for (const args of [[], ["foreign", "foreign", "foreign"]]) {
          await assert.rejects(async () => Reflect.apply(action, undefined, args), role === null ? /redirect:\/sign-in/ : /not-found:404/, name);
          checked++;
        }
      }
    }
  }
  assert.ok(checked >= 150, `Expected the complete action surface, checked ${checked}`);
  t.diagnostic(`${checked} direct denials across ${modules.length} action modules`);
  assert.equal(businessCalls, beforeCalls);
});

test("internal user and data lists cannot be read by an external identity", async () => {
  session = { user: { id: "actor", role: "OWNER", name: "Actor" } };
  currentUser = { id: "actor", role: "CUSTOMER", banned: false };
  const { getUsers } = await import("../src/lib/data/users");
  const { getIdeas } = await import("../src/lib/data/ideas");
  const { getDepartments } = await import("../src/lib/data/departments");
  const { getAssignmentsOverview } = await import("../src/lib/data/assignments");
  const { getDailyPlan } = await import("../src/lib/data/daily-plans");
  const { getPdfDesignerState } = await import("../src/lib/data/pdf-design");
  const beforeCalls = businessCalls;
  for (const call of [getUsers, getIdeas, getDepartments, getAssignmentsOverview, () => getDailyPlan("foreign", "2026-10-22"), () => getPdfDesignerState("foreign")]) {
    await assert.rejects(call, /not-found:404/);
  }
  assert.equal(businessCalls, beforeCalls);
});

test("internal HTTP validation stays reachable for OWNER and INTERN, and chat denials use DE/EN text", async () => {
  const preview = await import("../src/app/api/pdf-design/preview/route");
  const chat = await import("../src/app/api/chat/route");
  for (const role of ["OWNER", "INTERN"]) {
    session = { user: { id: "actor", role: "CUSTOMER", name: "Actor" } };
    currentUser = { id: "actor", role, banned: false };
    assert.equal((await preview.POST(new Request("http://localhost/api/pdf-design/preview", { method: "POST" }))).status, 415);
  }
  currentUser = { id: "actor", role: "CUSTOMER", banned: false };
  for (const language of ["de", "en"]) {
    locale = language;
    const response = await chat.GET(new NextRequest("http://localhost/api/chat"));
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { ok: false, error: language === "de" ? "Kein Zugriff auf die Academy." : "Academy access denied." });
  }
});
after(() => {
  for (const { target, name, value } of originals.reverse()) Reflect.set(target, name, value);
  mock.restoreAll();
});

test("Academy guard reads current DB role, rejects external/missing/banned users and ignores session claims", async () => {
  session = { user: { id: "actor", role: "OWNER", name: "Actor" } };
  for (const invalid of [null, { id: "actor", role: "CUSTOMER", banned: false }, { id: "actor", role: "OWNER,INTERN", banned: false }, { id: "actor", role: "OWNER", banned: true }]) {
    currentUser = invalid;
    const access = await getAcademyApiAccess();
    assert.equal(access.response?.status, 403);
    assert.equal(access.response?.headers.get("Cache-Control"), "private, no-store");
    await assert.rejects(requireAcademyUser());
  }
  for (const role of ["INTERN", "OWNER"]) {
    currentUser = { id: "actor", role, banned: false };
    assert.equal((await requireAcademyUser()).role, role);
  }
  currentUser = { id: "actor", role: "INTERN", banned: false };
  await assert.rejects(requirePlatformOwner(), /redirect:\/dashboard/);
  currentUser.role = "OWNER";
  assert.equal((await requirePlatformOwner()).role, "OWNER");
  currentUser.role = "CUSTOMER";
  await assert.rejects(getAcademyIdentity("actor"));
  session = null;
  assert.equal((await getAcademyApiAccess()).response?.status, 401);
  for (locale of ["de", "en"]) await assert.rejects(requireAcademyUser(), /redirect:\/sign-in/);
});

test("upload middleware permits current internal users and rejects external, banned and revoked upload callbacks", async () => {
  const { ourFileRouter } = await import("../src/lib/uploadthing");
  const args = { req: new Request("http://localhost/api/uploadthing"), files: [], input: undefined };
  for (const role of ["OWNER", "INTERN", "CUSTOMER", "banned", "deleted"]) {
    session = { user: { id: "actor", role: "OWNER", name: "Actor" } };
    currentUser = role === "deleted" ? null : { id: "actor", role: role === "banned" ? "OWNER" : role, banned: role === "banned" };
    for (const route of Object.values(ourFileRouter)) {
      const call = async () => Reflect.apply(route.middleware, undefined, [args]);
      if (role === "OWNER" || role === "INTERN") assert.deepEqual(await call(), { userId: "actor" });
      else await assert.rejects(call, /Forbidden/);
    }
  }
  session = null;
  await assert.rejects(async () => Reflect.apply(ourFileRouter.profileImage.middleware, undefined, [args]), /Unauthorized/);
  const beforeCalls = businessCalls;
  currentUser = { id: "actor", role: "CUSTOMER", banned: false };
  await assert.rejects(async () => Reflect.apply(ourFileRouter.profileImage.onUploadComplete, undefined, [{ metadata: { userId: "actor" }, file: {} }]), /Academy access denied/);
  assert.equal(businessCalls, beforeCalls);
});

test("existing internal actions stay usable and subsequent calls honor role revocation", async () => {
  const { prisma } = await import("../src/lib/prisma");
  const { getDiscussionNoteAction, saveDiscussionNoteAction } = await import("../src/lib/actions/discussion-notes.actions");
  let writes = 0;
  replace(prisma.discussionNote, "findUnique", async () => ({ content: "existing note" }));
  replace(prisma.discussionNote, "upsert", async () => { writes++; return {}; });
  for (const role of ["OWNER", "INTERN"]) {
    session = { user: { id: "actor", role: "CUSTOMER", name: "Actor" } };
    currentUser = { id: "actor", role, banned: false };
    assert.equal(await getDiscussionNoteAction(), "existing note");
    await saveDiscussionNoteAction("updated note");
  }
  assert.equal(writes, 2);
  currentUser = { id: "actor", role: "CUSTOMER", banned: false };
  await assert.rejects(saveDiscussionNoteAction("must not write"), /not-found:404/);
  assert.equal(writes, 2);
});

test("loyalty administration entry rejects direct calls without current platform-owner rights", async () => {
  const { default: entry } = await import("../src/app/[locale]/tools/calem/stempelkarten/admin/page");
  for (const role of [null, "CUSTOMER", "INTERN", "banned", "deleted", "OWNER,CUSTOMER"]) {
    session = role === null ? null : { user: { id: "actor", role: "OWNER", name: "Actor" } };
    currentUser = role === "deleted" ? null : { id: "actor", role: role === "banned" ? "OWNER" : role ?? "CUSTOMER", banned: role === "banned" };
    await assert.rejects(entry({ params: Promise.resolve({ locale: "de" }), searchParams: Promise.resolve({ organizationId: "foreign" }) }),
      role === null ? /redirect:\/sign-in/ : role === "INTERN" ? /redirect:\/dashboard/ : /not-found:404/);
  }
});
