import type { ActionResult } from "@/lib/errors";

// Unwraps the shared ActionResult envelope returned by every API route.
export async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);
  let body: ActionResult<T>;
  try {
    body = (await res.json()) as ActionResult<T>;
  } catch {
    throw new Error(`Request failed (${res.status}).`);
  }
  if (!body.ok) throw new Error(body.error);
  return body.data;
}
