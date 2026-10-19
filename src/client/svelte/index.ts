/**
 * Stores Svelte pour le plugin subscriptions.
 *
 * Ils consomment les actions enregistrées par `subscriptionsPlugin()`.
 */

import { derived, writable } from "svelte/store";
import type { Readable } from "svelte/store";
import type { ClientResponse, SubscriptionsClientActions } from "../index.js";
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

export interface AsyncStore<T> {
  data: Readable<T | null>;
  isLoading: Readable<boolean>;
  error: Readable<Error | null>;
  refetch?: () => Promise<void>;
}

export function createPlansStore(client: SubscriptionsClient): AsyncStore<Plan[]> {
  const data = writable<Plan[] | null>(null);
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const fetch = async () => {
    isLoading.set(true);
    error.set(null);
    try {
      const response = read(await client.subscriptions.listPlans());
      data.set(response.plans ?? []);
    } catch (err) {
      error.set(err instanceof Error ? err : new Error(String(err)));
    } finally {
      isLoading.set(false);
    }
  };

  void fetch();

  return {
    data: derived(data, ($data) => $data),
    isLoading: derived(isLoading, ($loading) => $loading),
    error: derived(error, ($error) => $error),
    refetch: fetch,
  };
}

export function createSubscriptionStore(client: SubscriptionsClient) {
  const data = writable<SubscriptionWithAdvantages | null>(null);
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const fetch = async () => {
    isLoading.set(true);
    error.set(null);
    try {
      data.set(read(await client.subscriptions.getMySubscription()));
    } catch (err) {
      error.set(err instanceof Error ? err : new Error(String(err)));
    } finally {
      isLoading.set(false);
    }
  };

  void fetch();

  return {
    data: derived(data, ($data) => $data),
    subscription: derived(data, ($data): Subscription | null => $data?.subscription ?? null),
    advantages: derived(data, ($data) => $data?.advantages ?? []),
    isLoading: derived(isLoading, ($loading) => $loading),
    error: derived(error, ($error) => $error),
    refetch: fetch,
  };
}

export function createSubscribeStore(client: SubscriptionsClient) {
  const subscription = writable<Subscription | null>(null);
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const subscribe = async (input: SubscribePayload) => {
    isLoading.set(true);
    error.set(null);
    try {
      const response = read(await client.subscriptions.subscribe(input));
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
    subscription: derived(subscription, ($subscription) => $subscription),
    isLoading: derived(isLoading, ($loading) => $loading),
    error: derived(error, ($error) => $error),
  };
}

export function createChangePlanStore(client: SubscriptionsClient) {
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const changePlan = async (subscriptionId: string, newPlanId: string) => {
    isLoading.set(true);
    error.set(null);
    try {
      return read(await client.subscriptions.changePlan({ subscriptionId, newPlanId })).subscription;
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

export function createCancelSubscriptionStore(client: SubscriptionsClient) {
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const cancel = async (subscriptionId: string, atPeriodEnd = true) => {
    isLoading.set(true);
    error.set(null);
    try {
      return read(
        await client.subscriptions.cancelSubscription({ subscriptionId, atPeriodEnd }),
      ).subscription;
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

export function createValidatePromoCodeStore(client: SubscriptionsClient) {
  const data = writable<PromoCode | null>(null);
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const validate = async (code: string, planId?: string, partnerId?: string) => {
    isLoading.set(true);
    error.set(null);
    try {
      const response = read(
        await client.subscriptions.validatePromoCode({ code, planId, partnerId }),
      );
      data.set(response.promo);
      return response.promo;
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

export function createRecordUsageStore(client: SubscriptionsClient) {
  const result = writable<UsageCheckResult | null>(null);
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const record = async (subscriptionId: string, advantageKey: string, quantity: number) => {
    isLoading.set(true);
    error.set(null);
    try {
      const response = read(
        await client.subscriptions.recordUsage({ subscriptionId, advantageKey, quantity }),
      );
      result.set(response);
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
    record,
    result: derived(result, ($result) => $result),
    isLoading: derived(isLoading, ($loading) => $loading),
    error: derived(error, ($error) => $error),
  };
}

export function createRequestCustomSubscriptionStore(client: SubscriptionsClient) {
  const data = writable<{ request: CustomSubscriptionRequest } | null>(null);
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const request = async (input: RequestCustomSubscriptionPayload) => {
    isLoading.set(true);
    error.set(null);
    try {
      const response = read(
        await client.subscriptions.requestCustomSubscription(input),
      );
      data.set(response);
      return response.request;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.set(errorObj);
      throw errorObj;
    } finally {
      isLoading.set(false);
    }
  };

  return {
    request,
    data: derived(data, ($data) => $data),
    isLoading: derived(isLoading, ($loading) => $loading),
    error: derived(error, ($error) => $error),
  };
}

export type { Readable, Writable } from "svelte/store";
