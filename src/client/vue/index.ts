/**
 * Vue.js client for subscriptions plugin.
 * Provides composables for accessing subscription features.
 */

import { ref, computed, onMounted } from "vue";

export interface UseAsyncResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch plans from the server.
 */
export function usePlans(client: any) {
  const data = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const fetch = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await (client as any).$fetch("/subscriptions/plans", {
        method: "GET",
      });
      data.value = response.plans || [];
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(fetch);

  return {
    data: computed(() => data.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    refetch: fetch,
  };
}

/**
 * Get current user's active subscription with advantages.
 */
export function useMySubscription(client: any) {
  const subscription = ref<any | null>(null);
  const advantages = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const fetch = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await (client as any).$fetch("/subscriptions/my-subscription", {
        method: "GET",
      });
      subscription.value = response.subscription;
      advantages.value = response.advantages || [];
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(fetch);

  return {
    data: computed(() => ({ subscription: subscription.value, advantages: advantages.value })),
    subscription: computed(() => subscription.value),
    advantages: computed(() => advantages.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    refetch: fetch,
  };
}

/**
 * Subscribe to a plan.
 */
export function useSubscribe(client: any) {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const subscription = ref<any | null>(null);

  const subscribe = async (input: {
    planId: string;
    provider?: string;
    promoCode?: string;
    quantity?: number;
    manualProofUrl?: string;
    manualMetadata?: Record<string, unknown>;
  }) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await (client as any).$fetch("/subscriptions/subscribe", {
        method: "POST",
        body: input,
      });
      subscription.value = response.subscription;
      return response.subscription;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.value = errorObj;
      throw errorObj;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    subscribe,
    subscription: computed(() => subscription.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
  };
}

/**
 * Change subscription plan.
 */
export function useChangePlan(client: any) {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const changePlan = async (subscriptionId: string, newPlanId: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await (client as any).$fetch("/subscriptions/change-plan", {
        method: "POST",
        body: { subscriptionId, newPlanId },
      });
      return response.subscription;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.value = errorObj;
      throw errorObj;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    changePlan,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
  };
}

/**
 * Cancel subscription.
 */
export function useCancelSubscription(client: any) {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const cancel = async (subscriptionId: string, atPeriodEnd: boolean = true) => {
    isLoading.value = true;
    error.value = null;
    try {
      await (client as any).$fetch("/subscriptions/cancel-subscription", {
        method: "POST",
        body: { subscriptionId, atPeriodEnd },
      });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.value = errorObj;
      throw errorObj;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    cancel,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
  };
}

/**
 * Validate promo code.
 */
export function useValidatePromoCode(client: any) {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const data = ref<any | null>(null);

  const validate = async (code: string, planId?: string, partnerId?: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await (client as any).$fetch("/subscriptions/validate-promo-code", {
        method: "POST",
        body: { code, planId, partnerId },
      });
      data.value = response;
      return response;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.value = errorObj;
      throw errorObj;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    validate,
    data: computed(() => data.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
  };
}

/**
 * Record usage for a subscription advantage.
 */
export function useRecordUsage(client: any) {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const record = async (subscriptionId: string, advantageKey: string, quantity: number) => {
    isLoading.value = true;
    error.value = null;
    try {
      await (client as any).$fetch("/subscriptions/record-usage", {
        method: "POST",
        body: { subscriptionId, advantageKey, quantity },
      });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.value = errorObj;
      throw errorObj;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    record,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
  };
}
