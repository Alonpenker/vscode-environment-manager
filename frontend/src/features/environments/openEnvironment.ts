/** Open an environment URL safely in a new tab. */
export function openEnvironmentUrl(url: string): void {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}
