import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import {
  ACCOUNT_DELETION_CONFIRMATION,
  type AccountDeletionOutcome,
  parseAccountDeletionResponse,
} from "../accountDeletion";
import { requireSupabase } from "../supabase";

async function readErrorResponse(error: FunctionsHttpError) {
  const response = error.context as Response | undefined;
  const status = typeof response?.status === "number" ? response.status : null;
  let body: unknown = null;
  try {
    body = await response?.json();
  } catch {
    body = null;
  }
  return { status, body };
}

/**
 * Ask the delete-account Edge Function to remove the signed-in member.
 * Identity comes from the session JWT attached by supabase-js; no user id is sent.
 */
export async function requestAccountDeletion(): Promise<AccountDeletionOutcome> {
  const client = requireSupabase();

  try {
    const { data, error } = await client.functions.invoke("delete-account", {
      body: { confirm: ACCOUNT_DELETION_CONFIRMATION },
    });

    if (!error) {
      return parseAccountDeletionResponse(200, data);
    }

    if (error instanceof FunctionsHttpError) {
      const { status, body } = await readErrorResponse(error);
      return parseAccountDeletionResponse(status, body);
    }

    if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
      return parseAccountDeletionResponse(null, null);
    }

    return parseAccountDeletionResponse(500, null);
  } catch {
    return parseAccountDeletionResponse(null, null);
  }
}
