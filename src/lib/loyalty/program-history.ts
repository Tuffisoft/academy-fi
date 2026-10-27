import { z } from "zod";

const position = z.object({
  __stempelfiHistoryPosition: z.number().int().nonnegative(),
});
function readPosition(state: unknown) {
  const parsed = position.safeParse(state);
  return parsed.success ? parsed.data.__stempelfiHistoryPosition : undefined;
}
function stamped(state: unknown, index: number) {
  return {
    ...(state && typeof state === "object" && !Array.isArray(state)
      ? state
      : {}),
    __stempelfiHistoryPosition: index,
  };
}
type Blocker = (proceed: () => void) => void;
export interface HistoryHost {
  history: Pick<History, "state" | "pushState" | "replaceState" | "go">;
  listen: (
    listener: (
      event: Pick<PopStateEvent, "state" | "stopImmediatePropagation">,
    ) => void,
  ) => () => void;
}

/** One document-wide tracker, installed before portal navigation. It retains Next's
 * state and intercepts popstate in capture phase, before the router can unmount inputs.
 */
export function createProgramHistory(host: HistoryHost) {
  const history = host.history;
  const push = history.pushState.bind(history),
    replace = history.replaceState.bind(history);
  let current = readPosition(history.state) ?? 0;
  let blocker: Blocker | undefined;
  let restoring: { from: number; to: number; owner: Blocker } | undefined;
  let approved: number | undefined;
  let request: object | undefined;
  replace(stamped(history.state, current), "");
  const pushState: History["pushState"] = (state: unknown, title, url) => {
    const next = current + 1;
    push(stamped(state, next), title, url);
    current = next;
  };
  const replaceState: History["replaceState"] = (state: unknown, title, url) =>
    replace(stamped(state, current), title, url);
  history.pushState = pushState;
  history.replaceState = replaceState;
  const unlisten = host.listen((event) => {
    const target = readPosition(event.state);
    // Entries from another document use the browser's beforeunload protection.
    if (target === undefined) return;
    if (restoring) {
      event.stopImmediatePropagation();
      const pending = restoring;
      if (target !== pending.from) {
        history.go(pending.from - target);
        return;
      }
      restoring = undefined;
      if (blocker !== pending.owner) return;
      const identity = {};
      request = identity;
      pending.owner(() => {
        if (request !== identity || blocker !== pending.owner) return;
        request = undefined;
        approved = pending.to;
        history.go(pending.to - current);
      });
      return;
    }
    if (approved === target) {
      approved = undefined;
      current = target;
      return;
    }
    if (blocker && target !== current) {
      event.stopImmediatePropagation();
      restoring = { from: current, to: target, owner: blocker };
      request = undefined;
      history.go(current - target);
      return;
    }
    current = target;
  });
  return {
    block(owner: Blocker) {
      blocker = owner;
      return () => {
        if (blocker === owner) {
          blocker = undefined;
          request = undefined;
        }
      };
    },
    dispose() {
      unlisten();
      if (history.pushState === pushState) history.pushState = push;
      if (history.replaceState === replaceState) history.replaceState = replace;
      blocker = undefined;
      request = undefined;
    },
  };
}

let documentHistory: ReturnType<typeof createProgramHistory> | undefined;
export function programHistory() {
  if (!documentHistory)
    documentHistory = createProgramHistory({
      history: window.history,
      listen(listener) {
        window.addEventListener("popstate", listener, true);
        return () => window.removeEventListener("popstate", listener, true);
      },
    });
  return documentHistory;
}
