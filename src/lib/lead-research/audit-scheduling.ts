export const MAX_PARALLEL_WEBSITE_AUDITS = 6;

// Each free slot takes the next lead immediately; a slow lead does not block
// the other slots at a fixed batch boundary.
export async function runAuditPool<T>(items: readonly T[], process: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL_WEBSITE_AUDITS, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await process(item);
    }
  }));
}
