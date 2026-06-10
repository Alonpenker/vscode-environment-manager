import { useCallback, useRef, useState } from "react";

interface UseClipboardResult {
  copied: boolean;
  copy: (value: string) => Promise<void>;
}

/** Copy text to the clipboard and briefly flag success for UI feedback. */
export function useClipboard(resetMs = 1500): UseClipboardResult {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), resetMs);
      } catch {
        setCopied(false);
      }
    },
    [resetMs],
  );

  return { copied, copy };
}
