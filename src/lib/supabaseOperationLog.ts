type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
  status?: number | string | null;
};

export function logSupabaseOperation(
  operation: string,
  error: SupabaseLikeError | Error | null | undefined,
  meta?: Record<string, unknown>,
) {
  if (!error) return;

  const payload = {
    operation,
    code: "code" in error ? error.code ?? null : null,
    message: error.message ?? String(error),
    details: "details" in error ? error.details ?? null : null,
    hint: "hint" in error ? error.hint ?? null : null,
    status: "status" in error ? error.status ?? null : null,
    ...meta,
  };

  console.error("[supabase]", payload);
}
