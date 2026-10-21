/**
 * Copy text to the clipboard, working on plain HTTP too.
 *
 * `navigator.clipboard` only exists in a secure context (HTTPS or localhost). On an
 * HTTP deployment it is `undefined`, so calling it throws and the copy silently fails.
 * We try it first, then fall back to the old execCommand trick, which has no such
 * restriction.
 *
 * @returns true if the text made it to the clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Preferred path — available on HTTPS and localhost.
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied, or the document wasn't focused. Fall through.
    }
  }

  // Legacy fallback: select a hidden textarea and let the browser copy the selection.
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    // Keep it off-screen and non-disruptive: no scroll jump, no visible flash,
    // and readOnly so mobile keyboards don't pop up.
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';

    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length); // iOS needs the explicit range

    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
