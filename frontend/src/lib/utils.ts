import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional Tailwind classes, resolving conflicts predictably. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Final path segment used as an environment's display name. */
export function deriveDisplayName(requestedPath: string): string {
  const trimmed = requestedPath.replace(/[/\\]+$/, "");
  const segments = trimmed.split(/[/\\]+/).filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : requestedPath;
}

/** Shorten a long container/network id to a readable prefix. */
export function shortenId(id: string, length = 12): string {
  if (!id) return "";
  return id.length > length ? id.slice(0, length) : id;
}
