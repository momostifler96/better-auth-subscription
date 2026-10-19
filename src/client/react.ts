/**
 * Hooks React pour le plugin subscriptions.
 *
 * Utilise les patterns React Query/SWR pour la gestion de l'état et du cache.
 * À adapter selon votre setup (React Query, SWR, ou état local).
 *
 * @example
 * ```tsx
 * import { useSubscriptions } from "better-subscriptions/client/react";
 *
 * export function PlanList() {
 *   const { data: plans, isLoading, error } = useSubscriptions().listPlans();
 *
 *   if (isLoading) return <div>Chargement...</div>;
 *   if (error) return <div>Erreur: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {plans?.map(plan => (
 *         <div key={plan.id}>{plan.name}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { useCallback, useEffect, useState } from "react";
import type {
  Plan,
  Subscription,
  SubscriptionWithAdvantages,
  CustomSubscriptionRequest,
} from "./types.js";

interface UseAsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function read<T = any>(response: any): T {
  if (response?.error) {
    throw new Error(
      response.error.message ?? `Request failed${response.error.status ? ` (${response.error.status})` : ""}`,
    );
  }
  return response?.data as T;
}

/**
 * Hook générique pour les appels asynchrones.
 */
function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: unknown[] = [],
): UseAsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [asyncFn]);

  useEffect(() => {
    refetch();
  }, deps);

  return { data, isLoading, error, refetch };
}

/**
 * Hook pour récupérer la liste des plans publics.
 */
export function usePlans(client: any) {
  return useAsync(
    () => client.subscriptions.listPlans().then((response: any) => read(response).plans),
    [client],
  );
}

/**
 * Hook pour récupérer l'abonnement actif de l'utilisateur.
 */
export function useMySubscription(
  client: any,
  enabled = true,
): UseAsyncState<SubscriptionWithAdvantages> {
  const [data, setData] = useState<SubscriptionWithAdvantages | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = read<SubscriptionWithAdvantages>(await client.subscriptions.getMySubscription());
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [client, enabled]);

  useEffect(() => {
    refetch();
  }, [client, enabled]);

  return { data, isLoading, error, refetch };
}

/**
 * Hook pour s'abonner à un plan.
 */
export function useSubscribe(client: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<Subscription | null>(null);

  const subscribe = useCallback(
    async (params: {
      planId: string;
      provider?: string;
      promoCode?: string;
      quantity?: number;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = read(await client.subscriptions.subscribe(params));
        setData(result.subscription);
        return result.subscription;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { subscribe, isLoading, error, data };
}

/**
 * Hook pour changer de plan.
 */
export function useChangePlan(client: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const changePlan = useCallback(
    async (subscriptionId: string, newPlanId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = read(
          await client.subscriptions.changePlan({
            subscriptionId,
            newPlanId,
          }),
        );
        return result.subscription;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { changePlan, isLoading, error };
}

/**
 * Hook pour annuler l'abonnement.
 */
export function useCancelSubscription(client: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cancel = useCallback(
    async (subscriptionId: string, atPeriodEnd = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = read(
          await client.subscriptions.cancelSubscription({
            subscriptionId,
            atPeriodEnd,
          }),
        );
        return result.subscription;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { cancel, isLoading, error };
}

/**
 * Hook pour valider un code promo.
 */
export function useValidatePromoCode(client: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<any>(null);

  const validate = useCallback(
    async (code: string, planId?: string, partnerId?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = read(
          await client.subscriptions.validatePromoCode({
            code,
            planId,
            partnerId,
          }),
        );
        setData(result.promo);
        return result.promo;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { validate, isLoading, error, data };
}

/**
 * Hook pour enregistrer l'utilisation d'un avantage.
 */
export function useRecordUsage(client: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const record = useCallback(
    async (subscriptionId: string, advantageKey: string, quantity: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = read(
          await client.subscriptions.recordUsage({
            subscriptionId,
            advantageKey,
            quantity,
          }),
        );
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { record, isLoading, error };
}

/**
 * Hook pour demander un abonnement personnalisé.
 */
export function useRequestCustomSubscription(client: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<any>(null);

  const request = useCallback(
    async (params: {
      requestedAdvantages: Array<{
        advantageKey: string;
        value: boolean | number | null;
      }>;
      proposedPriceCents?: number;
      proposedCurrency?: string;
      proposedInterval?: string;
      justification?: string;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = read(
          await client.subscriptions.requestCustomSubscription(params),
        );
        setData(result.request);
        return result.request;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { request, isLoading, error, data };
}

/**
 * Hook collection - Accès à tous les hooks en une seule importation.
 */
export function useSubscriptions(client: any) {
  return {
    usePlans: () => usePlans(client),
    useMySubscription: (enabled?: boolean) =>
      useMySubscription(client, enabled),
    useSubscribe: () => useSubscribe(client),
    useChangePlan: () => useChangePlan(client),
    useCancelSubscription: () => useCancelSubscription(client),
    useValidatePromoCode: () => useValidatePromoCode(client),
    useRecordUsage: () => useRecordUsage(client),
    useRequestCustomSubscription: () =>
      useRequestCustomSubscription(client),
  };

}
