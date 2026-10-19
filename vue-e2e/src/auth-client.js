import { createAuthClient } from "better-auth/vue";
import { subscriptionsPlugin } from "better-subscriptions/client/vue";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [subscriptionsPlugin()],
});
