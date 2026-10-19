/**
 * Composables Vue pour le plugin subscriptions.
 *
 * Ils consomment les actions enregistrées par `subscriptionsPlugin()` :
 * le client doit donc être créé avec ce plugin.
 */

import { computed, onMounted, ref } from "vue";
import type { SubscriptionsClientActions, ClientResponse } from "../index.js";
import type {
  CustomSubscriptionRequest,
  Plan,
  PromoCode,
  RequestCustomSubscriptionPayload,
  SubscribePayload,
  Subscription,
  SubscriptionWithAdvantages,
  UsageCheckResult,
} from "../types.js";

export { subscriptionsPlugin } from "../index.js";

type SubscriptionsClient = {
  subscriptions: SubscriptionsClientActions["subscriptions"];
};

function read<T>(response: ClientResponse<T>): T {
  if (response.error) {
    throw new Error(
      response.error.message ?? `Request failed${response.error.status ? ` (${response.error.status})` : ""}`,
    );
  }
  return response.data as T;
}

export interface UseAsyncResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePlans(client: SubscriptionsClient) {
  const plans = ref<Plan[]>([]);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const fetch = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = read(await client.subscriptions.listPlans());
      plans.value = response.plans ?? [];
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(fetch);

  return {
    data: computed(() => plans.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    refetch: fetch,
  };
}

export function useMySubscription(client: SubscriptionsClient) {
  const data = ref<SubscriptionWithAdvantages | null>(null);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const fetch = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      data.value = read(await client.subscriptions.getMySubscription());
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(fetch);

  return {
    data: computed(() => data.value),
    subscription: computed<Subscription | null>(() => data.value?.subscription ?? null),
    advantages: computed(() => data.value?.advantages ?? []),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    refetch: fetch,
  };
}

export function useSubscribe(client: SubscriptionsClient) {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const subscription = ref<Subscription | null>(null);

  const subscribe = async (input: SubscribePayload) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = read(await client.subscriptions.subscribe(input));
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

export function useChangePlan(client: SubscriptionsClient) {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const changePlan = async (subscriptionId: string, newPlanId: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = read(
        await client.subscriptions.changePlan({ subscriptionId, newPlanId }),
      );
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

export function useCancelSubscription(client: SubscriptionsClient) {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const cancel = async (subscriptionId: string, atPeriodEnd = true) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = read(
        await client.subscriptions.cancelSubscription({ subscriptionId, atPeriodEnd }),
      );
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
    cancel,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
  };
}

export function useValidatePromoCode(client: SubscriptionsClient) {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const data = ref<PromoCode | null>(null);

  const validate = async (code: string, planId?: string, partnerId?: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = read(
        await client.subscriptions.validatePromoCode({ code, planId, partnerId }),
      );
      data.value = response.promo;
      return response.promo;
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

export function useRecordUsage(client: SubscriptionsClient) {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const result = ref<UsageCheckResult | null>(null);

  const record = async (subscriptionId: string, advantageKey: string, quantity: number) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = read(
        await client.subscriptions.recordUsage({ subscriptionId, advantageKey, quantity }),
      );
      result.value = response;
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
    record,
    result: computed(() => result.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
  };
}

export function useRequestCustomSubscription(client: SubscriptionsClient) {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const data = ref<{ request: CustomSubscriptionRequest } | null>(null);

  const request = async (input: RequestCustomSubscriptionPayload) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = read(await client.subscriptions.requestCustomSubscription(input));
      data.value = response;
      return response.request;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.value = errorObj;
      throw errorObj;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    request,
    data: computed(() => data.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
  };
}
