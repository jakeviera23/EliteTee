/** Split free-text list fields the same way web ProfileDossier does. */
export function parseListInput(value: string): string[] {
  const unique = new Map<string, string>();
  for (const part of value.split(/[\n,]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase();
    if (!unique.has(key)) unique.set(key, trimmed);
  }
  return [...unique.values()];
}

export function formatListInput(values: string[]): string {
  return values.filter(Boolean).join("\n");
}
