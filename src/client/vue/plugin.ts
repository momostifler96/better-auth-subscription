/**
 * Plugin client Vue : enregistre les actions Better Auth et réexporte les
 * composables d'abonnement.
 *
 * ```ts
 * import { createAuthClient } from "better-auth/vue";
 * import { subscriptionsPlugin } from "better-subscriptions/client/vue";
 *
 * const authClient = createAuthClient({ plugins: [subscriptionsPlugin()] });
 * ```
 */
export { subscriptionsPlugin } from "../index.js";
export * from "./index.js";
