/**
 * Svelte client for subscriptions plugin.
 * Provides stores for accessing subscription features.
 */

import { writable, readable, derived } from "svelte/store";
import type { Readable, Writable } from "svelte/store";

export interface AsyncStore<T> {
  data: Readable<T | null>;
  isLoading: Readable<boolean>;
  error: Readable<Error | null>;
  refetch?: () => Promise<void>;
}

/**
 * Fetch plans from the server.
 */
export function createPlansStore(client: any): AsyncStore<any[]> {
  const data = writable<any[] | null>(null);
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const fetch = async () => {
    isLoading.set(true);
    error.set(null);
    try {
      const response = await (client as any).$fetch("/subscriptions/plans", {
        method: "GET",
      });
      data.set(response.plans || []);
    } catch (err) {
      error.set(err instanceof Error ? err : new Error(String(err)));
    } finally {
      isLoading.set(false);
    }
  };

  // Auto-fetch on creation
  fetch();

  return {
    data: derived(data, ($data) => $data),
    isLoading: derived(isLoading, ($loading) => $loading),
    error: derived(error, ($error) => $error),
    refetch: fetch,
  };
}

/**
 * Get current user's active subscription with advantages.
 */
export function createSubscriptionStore(client: any) {
  const subscription = writable<any | null>(null);
  const advantages = writable<any[]>([]);
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const fetch = async () => {
    isLoading.set(true);
    error.set(null);
    try {
      const response = await (client as any).$fetch("/subscriptions/my-subscription", {
        method: "GET",
      });
      subscription.set(response.subscription);
      advantages.set(response.advantages || []);
    } catch (err) {
      error.set(err instanceof Error ? err : new Error(String(err)));
    } finally {
      isLoading.set(false);
    }
  };

  // Auto-fetch on creation
  fetch();

  return {
    subscription: derived(subscription, ($sub) => $sub),
    advantages: derived(advantages, ($adv) => $adv),
    isLoading: derived(isLoading, ($loading) => $loading),
    error: derived(error, ($error) => $error),
    refetch: fetch,
  };
}

/**
 * Subscribe to a plan.
 */
export function createSubscribeStore(client: any) {
  const subscription = writable<any | null>(null);
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const subscribe = async (input: {
    planId: string;
    provider?: string;
    promoCode?: string;
    quantity?: number;
    manualProofUrl?: string;
    manualMetadata?: Record<string, unknown>;
  }) => {
    isLoading.set(true);
    error.set(null);
    try {
      const response = await (client as any).$fetch("/subscriptions/subscribe", {
        method: "POST",
        body: input,
      });
      subscription.set(response.subscription);
      return response.subscription;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.set(errorObj);
      throw errorObj;
    } finally {
      isLoading.set(false);
    }
  };

  return {
    subscribe,
    subscription: derived(subscription, ($sub) => $sub),
    isLoading: derived(isLoading, ($loading) => $loading),
    error: derived(error, ($error) => $error),
  };
}

/**
 * Change subscription plan.
 */
export function createChangePlanStore(client: any) {
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const changePlan = async (subscriptionId: string, newPlanId: string) => {
    isLoading.set(true);
    error.set(null);
    try {
      const response = await (client as any).$fetch("/subscriptions/change-plan", {
        method: "POST",
        body: { subscriptionId, newPlanId },
      });
      return response.subscription;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.set(errorObj);
      throw errorObj;
    } finally {
      isLoading.set(false);
    }
  };

  return {
    changePlan,
    isLoading: derived(isLoading, ($loading) => $loading),
    error: derived(error, ($error) => $error),
  };
}

/**
 * Cancel subscription.
 */
export function createCancelSubscriptionStore(client: any) {
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const cancel = async (subscriptionId: string, atPeriodEnd: boolean = true) => {
    isLoading.set(true);
    error.set(null);
    try {
      await (client as any).$fetch("/subscriptions/cancel-subscription", {
        method: "POST",
        body: { subscriptionId, atPeriodEnd },
      });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.set(errorObj);
      throw errorObj;
    } finally {
      isLoading.set(false);
    }
  };

  return {
    cancel,
    isLoading: derived(isLoading, ($loading) => $loading),
    error: derived(error, ($error) => $error),
  };
}

/**
 * Validate promo code.
 */
export function createValidatePromoCodeStore(client: any) {
  const data = writable<any | null>(null);
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const validate = async (code: string, planId?: string, partnerId?: string) => {
    isLoading.set(true);
    error.set(null);
    try {
      const response = await (client as any).$fetch("/subscriptions/validate-promo-code", {
        method: "POST",
        body: { code, planId, partnerId },
      });
      data.set(response);
      return response;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.set(errorObj);
      throw errorObj;
    } finally {
      isLoading.set(false);
    }
  };

  return {
    validate,
    data: derived(data, ($data) => $data),
    isLoading: derived(isLoading, ($loading) => $loading),
    error: derived(error, ($error) => $error),
  };
}

/**
 * Record usage for a subscription advantage.
 */
export function createRecordUsageStore(client: any) {
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const record = async (subscriptionId: string, advantageKey: string, quantity: number) => {
    isLoading.set(true);
    error.set(null);
    try {
      await (client as any).$fetch("/subscriptions/record-usage", {
        method: "POST",
        body: { subscriptionId, advantageKey, quantity },
      });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.set(errorObj);
      throw errorObj;
    } finally {
      isLoading.set(false);
    }
  };

  return {
    record,
    isLoading: derived(isLoading, ($loading) => $loading),
    error: derived(error, ($error) => $error),
  };
}

// Re-export store types
export type { Readable, Writable } from "svelte/store";
