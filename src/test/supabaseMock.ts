import { vi } from "vitest";

/** One `supabase.from(table)` query and every builder call made on it. */
export type QueryCall = { table: string; ops: Array<[method: string, args: unknown[]]> };
type Result = { data: unknown; error: unknown };

/**
 * A fake Supabase client that records queries instead of sending them.
 * Builder calls (`select`, `eq`, `order`, ...) chain freely; awaiting the
 * query resolves to the result set for its table (default: empty list).
 *
 * Use it from a test with:
 *   vi.mock("@/integrations/supabase/client", async () =>
 *     ({ supabase: (await import("@/test/supabaseMock")).supabaseMock.client }));
 */
function createSupabaseMock() {
  const calls: QueryCall[] = [];
  const results = new Map<string, Result>();

  const builder = (call: QueryCall): unknown =>
    new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            const result = results.get(call.table) ?? { data: [], error: null };
            return (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) =>
              Promise.resolve(result).then(resolve, reject);
          }
          return (...args: unknown[]) => {
            call.ops.push([String(prop), args]);
            return builder(call);
          };
        },
      },
    );

  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "user-1", email: "user@example.com" } }, error: null })),
    },
    from: vi.fn((table: string) => {
      const call: QueryCall = { table, ops: [] };
      calls.push(call);
      return builder(call);
    }),
    rpc: vi.fn(async () => ({ data: null, error: null })),
    functions: { invoke: vi.fn(async () => ({ data: {}, error: null })) },
  };

  return {
    client,
    calls,
    /** What awaiting a query on `table` resolves to. */
    setResult(table: string, result: Partial<Result>) {
      results.set(table, { data: null, error: null, ...result });
    },
    reset() {
      calls.length = 0;
      results.clear();
      vi.clearAllMocks();
    },
  };
}

export const supabaseMock = createSupabaseMock();

/** True when the query filtered `column` to exactly `value`. */
export const hasEq = (call: QueryCall, column: string, value: unknown) =>
  call.ops.some(([method, args]) => method === "eq" && args[0] === column && args[1] === value);
