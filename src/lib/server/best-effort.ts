/**
 * Runs a side-effect callback without letting its failure break the caller.
 *
 * Rollup / storage / cache invalidation writes are best-effort: the primary
 * operation (chat delivery, bot deletion, document upload) must always win.
 * A failure here is logged and swallowed so the caller can continue.
 *
 * Previously this helper was copy-pasted (with different log-tag prefixes) in
 * 4 call sites; this is the single source of truth.
 *
 * @param label   human-readable name of the side-effect, used in the warn log
 * @param tag     short log prefix, e.g. "chat", "bot-actions"
 * @param callback async work to attempt
 */
export async function recordBestEffort(label: string, tag: string, callback: () => Promise<unknown>): Promise<void> {
  try {
    await callback();
  } catch (error) {
    console.warn(`[${tag}] ${label} update failed`, error);
  }
}
