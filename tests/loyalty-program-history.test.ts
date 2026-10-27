import assert from "node:assert/strict";
import test from "node:test";
import { createProgramHistory, type HistoryHost } from "../src/lib/loyalty/program-history";

function browser() {
  const entries = [{ state: { __NA: true, router: "initial" } as unknown, url: "/initial" }];
  let index = 0;
  let listener: Parameters<HistoryHost["listen"]>[0] | undefined;
  const moves: number[] = [], routed: string[] = [];
  const host: HistoryHost = {
    history: {
      get state() { return entries[index].state; },
      pushState(state: unknown, _title: string, url?: string | URL | null) { entries.splice(index + 1); entries.push({ state, url: String(url ?? entries[index].url) }); index++; },
      replaceState(state: unknown, _title: string, url?: string | URL | null) { entries[index] = { state, url: String(url ?? entries[index].url) }; },
      go(delta = 0) { moves.push(delta); },
    },
    listen(value) { listener = value; return () => { listener = undefined; }; },
  };
  function travel(delta: number) {
    index += delta;
    assert.ok(index >= 0 && index < entries.length);
    let stopped = false;
    listener?.({ state: entries[index].state, stopImmediatePropagation() { stopped = true; } });
    if (!stopped) routed.push(entries[index].url);
  }
  function flush() { while (moves.length) travel(moves.shift()!); }
  return { host, entries, routed, travel, flush, url: () => entries[index].url };
}

for (const direction of [-1, 1]) {
  test(`dirty ${direction < 0 ? "back" : "forward"}: cancel preserves entry and confirm reaches original destination once`, () => {
    const b = browser(), guard = createProgramHistory(b.host);
    b.host.history.pushState({ __NA: true, router: "editor" }, "", "/editor");
    b.host.history.pushState({ __NA: true, router: "after" }, "", "/after");
    b.travel(-1); // editor, with both earlier and later entries
    const initialEntries = b.entries.length;
    let proceed: (() => void) | undefined;
    let prompts = 0;
    const unblock = guard.block(action => { proceed = action; prompts++; });
    b.routed.length = 0;
    b.travel(direction);
    assert.equal(prompts, 0, "restore URL before showing dialog");
    b.flush();
    assert.equal(b.url(), "/editor");
    assert.equal(prompts, 1);
    assert.deepEqual(b.routed, [], "router must not unmount editor");
    assert.equal(b.entries.length, initialEntries, "cancel must not duplicate history");
    // Ignoring the first continuation is Cancel/Escape. Another attempt still works.
    const stale = proceed;
    b.travel(direction); b.flush();
    stale?.(); b.flush();
    assert.equal(b.url(), "/editor", "stale dialog must not navigate");
    proceed?.(); b.flush();
    assert.equal(b.url(), direction < 0 ? "/initial" : "/after");
    assert.deepEqual(b.routed, [direction < 0 ? "/initial" : "/after"]);
    proceed?.(); b.flush();
    assert.equal(b.routed.length, 1);
    assert.equal(prompts, 2, "no second dialog after confirmation");
    unblock(); guard.dispose();
  });
}

test("clean traversal, replacement, multi-entry jumps and unsubscription preserve router state", () => {
  const b = browser(), guard = createProgramHistory(b.host);
  for (let i = 1; i <= 3; i++) b.host.history.pushState({ __NA: true, router: `tree-${i}` }, "", `/page-${i}`);
  b.host.history.replaceState({ __NA: true, router: "saved-editor" }, "", "/saved");
  assert.deepEqual(b.host.history.state, { __NA: true, router: "saved-editor", __stempelfiHistoryPosition: 3 });
  let proceed: (() => void) | undefined;
  const unblock = guard.block(action => { proceed = action; });
  b.travel(-3); b.flush();
  assert.equal(b.url(), "/saved");
  unblock(); proceed?.(); b.flush();
  assert.equal(b.url(), "/saved");
  b.travel(-3);
  assert.equal(b.url(), "/initial");
  b.travel(3);
  assert.equal(b.url(), "/saved");
  assert.equal(b.entries.length, 4);
  guard.dispose();
});
