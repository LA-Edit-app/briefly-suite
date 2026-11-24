import { supabase } from "@/integrations/supabase/client";

/**
 * Calls an Edge Function and surfaces its own error message.
 * On a non-2xx response functions.invoke only returns a generic error; the
 * function's message is in the response body.
 */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const response = (error as { context?: Response }).context;
    const payload = response ? await response.json().catch(() => null) : null;
    throw new Error(payload?.error ?? error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
