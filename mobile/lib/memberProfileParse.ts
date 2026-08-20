/** Postgres array + RPC row normalization — mirrors web memberProfiles.ts */

export function parsePostgresArrayString(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "{}") return [];

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];

    const items: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < inner.length; index += 1) {
      const char = inner[index];
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (char === "," && !inQuotes) {
        const item = current.trim();
        if (item) items.push(item);
        current = "";
        continue;
      }
      current += char;
    }

    const lastItem = current.trim();
    if (lastItem) items.push(lastItem);
    return items;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    }
  } catch {
    // Fall through.
  }

  return trimmed
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function coerceProfileStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return parsePostgresArrayString(value);
  }
  return [];
}

export function extractRpcProfileRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  }
  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }
  return null;
}
