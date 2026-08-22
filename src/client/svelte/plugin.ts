/**
 * Svelte plugin for better-auth subscriptions client.
 *
 * Usage:
 * ```ts
 * import { createAuthClient } from "better-auth/client";
 * import { subscriptionsPlugin } from "better-subscriptions/client/svelte";
 *
 * const authClient = createAuthClient({
 *   baseURL: "http://localhost:3000",
 *   plugins: [subscriptionsPlugin()],
 * });
 * ```
 */

export function subscriptionsPlugin() {
  return {
    id: "subscriptions",
    init(client: any) {
      return {
        client,
      };
    },
  };
}

// Re-export all stores
export * from "./index";
