/**
 * Plugin client Better Auth pour la gestion des abonnements.
 *
 * Enregistre les actions `authClient.subscriptions.*` typées et alignées sur
 * les endpoints HTTP du plugin serveur.
 *
 * @example
 * ```ts
 * import { createAuthClient } from "better-auth/react";
 * import { subscriptionsPlugin } from "better-subscriptions/client";
 *
 * export const authClient = createAuthClient({
 *   plugins: [subscriptionsPlugin()],
 * });
 *
 * const { data, error } = await authClient.subscriptions.listPlans();
 * ```
 */

import type { BetterAuthClientPlugin } from "better-auth/client";
import type {
  Advantage,
  AdvantageSelection,
  ApproveCustomRequestPayload,
  AuditLog,
  AuthorizeOveragePayload,
  CancelSubscriptionPayload,
  ChangePlanPayload,
  CreateAdvantagePayload,
  CreatePartnerPayload,
  CreatePartnerPlanPayload,
  CreatePlanPayload,
  CreatePromoCodePayload,
  CustomSubscriptionRequest,
  ListAuditLogsParams,
  ListPlansResponse,
  Partner,
  Plan,
  PlanPrice,
  PromoCode,
  RecordUsagePayload,
  RejectCustomRequestPayload,
  RequestCustomSubscriptionPayload,
  SubscribePayload,
  Subscription,
  SubscriptionWithAdvantages,
  UsageCheckResult,
  ValidatePromoCodePayload,
} from "./types.js";

// Réexporter tous les types depuis le fichier de types.
export type {
  Plan,
  PlanPrice,
  Advantage,
  AdvantageSelection,
  PlanAdvantage,
  Subscription,
  SubscriptionWithAdvantages,
  PlanAdvantageWithDetail,
  CustomSubscriptionRequest,
  PromoCode,
  PromoRedemption,
  Partner,
  UsageRecord,
  OverageAuthorization,
  AuditLog,
  ListPlansResponse,
  GetMySubscriptionResponse,
  SubscribeResponse,
  ChangePlanResponse,
  CancelSubscriptionResponse,
  ValidatePromoCodeResponse,
  PromoCodeValidation,
  CreatePromoCodeResponse,
  CreateAdvantageResponse,
  CreatePlanResponse,
  CreatePartnerResponse,
  CreatePartnerPlanResponse,
  RequestCustomSubscriptionResponse,
  ListPendingCustomRequestsResponse,
  ApproveCustomRequestResponse,
  RejectCustomRequestResponse,
  RecordUsageResponse,
  AuthorizeOverageResponse,
  ListAuditLogsResponse,
  SubscribePayload,
  ChangePlanPayload,
  CancelSubscriptionPayload,
  ValidatePromoCodePayload,
  CreatePromoCodePayload,
  CreateAdvantagePayload,
  CreatePlanPayload,
  CreatePartnerPayload,
  CreatePartnerPlanPayload,
  RequestCustomSubscriptionPayload,
  ApproveCustomRequestPayload,
  RejectCustomRequestPayload,
  RecordUsagePayload,
  AuthorizeOveragePayload,
  SubscriptionStatus,
  PromoCodeType,
  BillingMode,
  PlanKind,
  ActorType,
  CustomRequestStatus,
  UsageCheckResult,
} from "./types.js";

export type ClientError = {
  message?: string;
  status?: number;
  statusText?: string;
  code?: string;
  [key: string]: unknown;
};

/** Réponse renvoyée par les actions du client (compatible Better Fetch). */
export type ClientResponse<T> = {
  data: T | null;
  error: ClientError | null;
};

export type RequestOptions = {
  headers?: HeadersInit;
  throw?: boolean;
  [key: string]: unknown;
};

type Fetch = (path: string, options?: Record<string, unknown>) => Promise<unknown>;

async function call<T>(promise: Promise<unknown>): Promise<ClientResponse<T>> {
  try {
    const result = (await promise) as ClientResponse<T> | T | null | undefined;
    if (result && typeof result === "object" && "data" in (result as object)) {
      return result as ClientResponse<T>;
    }
    return { data: (result ?? null) as T | null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : String(error) },
    };
  }
}

export interface UpdateAdvantagePayload {
  name: string;
  description?: string;
  valueType: "boolean" | "quantity";
  unit?: string;
}

export interface UpdatePlanPayload {
  name: string;
  description?: string;
  isPublic?: boolean;
  isActive?: boolean;
  prices?: PlanPrice[];
  advantages?: AdvantageSelection[];
}

export interface SubscriptionsClientActions {
  subscriptions: {
    listPlans: (options?: RequestOptions) => Promise<ClientResponse<ListPlansResponse>>;
    getMySubscription: (options?: RequestOptions) => Promise<ClientResponse<SubscriptionWithAdvantages>>;
    subscribe: (data: SubscribePayload, options?: RequestOptions) => Promise<ClientResponse<{ subscription: Subscription }>>;
    changePlan: (data: ChangePlanPayload, options?: RequestOptions) => Promise<ClientResponse<{ subscription: Subscription }>>;
    cancelSubscription: (data: CancelSubscriptionPayload, options?: RequestOptions) => Promise<ClientResponse<{ subscription: Subscription }>>;
    validatePromoCode: (data: ValidatePromoCodePayload, options?: RequestOptions) => Promise<ClientResponse<{ promo: PromoCode }>>;
    requestCustomSubscription: (data: RequestCustomSubscriptionPayload, options?: RequestOptions) => Promise<ClientResponse<{ request: CustomSubscriptionRequest }>>;
    recordUsage: (data: RecordUsagePayload, options?: RequestOptions) => Promise<ClientResponse<UsageCheckResult>>;

    listAdvantages: (options?: RequestOptions) => Promise<ClientResponse<{ advantages: Advantage[] }>>;
    createAdvantage: (data: CreateAdvantagePayload, options?: RequestOptions) => Promise<ClientResponse<{ advantage: Advantage }>>;
    updateAdvantage: (key: string, data: UpdateAdvantagePayload, options?: RequestOptions) => Promise<ClientResponse<{ advantage: Advantage }>>;
    createPlan: (data: CreatePlanPayload, options?: RequestOptions) => Promise<ClientResponse<{ plan: Plan }>>;
    updatePlan: (slug: string, data: UpdatePlanPayload, options?: RequestOptions) => Promise<ClientResponse<{ plan: Plan }>>;
    createPromoCode: (data: CreatePromoCodePayload, options?: RequestOptions) => Promise<ClientResponse<{ promo: PromoCode }>>;
    createPartner: (data: CreatePartnerPayload, options?: RequestOptions) => Promise<ClientResponse<{ partner: Partner }>>;
    createPartnerPlan: (partnerId: string, data: CreatePartnerPlanPayload, options?: RequestOptions) => Promise<ClientResponse<{ plan: Plan }>>;
    listPendingCustomRequests: (options?: RequestOptions) => Promise<ClientResponse<{ requests: CustomSubscriptionRequest[] }>>;
    approveCustomRequest: (id: string, data?: ApproveCustomRequestPayload, options?: RequestOptions) => Promise<ClientResponse<{ subscription: Subscription }>>;
    rejectCustomRequest: (id: string, data?: RejectCustomRequestPayload, options?: RequestOptions) => Promise<ClientResponse<{ request: CustomSubscriptionRequest }>>;
    listPendingSubscriptions: (options?: RequestOptions) => Promise<ClientResponse<{ subscriptions: Subscription[] }>>;
    approveSubscription: (id: string, options?: RequestOptions) => Promise<ClientResponse<{ subscription: Subscription }>>;
    rejectSubscription: (id: string, data?: { reason?: string }, options?: RequestOptions) => Promise<ClientResponse<{ subscription: Subscription }>>;
    authorizeOverage: (data: AuthorizeOveragePayload, options?: RequestOptions) => Promise<ClientResponse<{ authorization: unknown }>>;
    listAuditLogs: (params?: ListAuditLogsParams, options?: RequestOptions) => Promise<ClientResponse<{ logs: AuditLog[] }>>;
  };
}

export function subscriptionsPlugin() {
  const plugin = {
    id: "subscriptions",
    pathMethods: {
      "/subscriptions/plans": "GET",
      "/subscriptions/me": "GET",
      "/subscriptions/advantages": "GET",
      "/subscriptions/custom-requests/pending": "GET",
      "/subscriptions/pending": "GET",
      "/subscriptions/audit-logs": "GET",
    },
    getActions: ($fetch: Fetch): SubscriptionsClientActions => {
      const get = <T>(path: string, options?: RequestOptions) =>
        call<T>($fetch(path, { ...options, method: "GET" }));
      const post = <T>(path: string, body?: unknown, options?: RequestOptions) =>
        call<T>($fetch(path, { ...options, method: "POST", body }));
      const patch = <T>(path: string, body?: unknown, options?: RequestOptions) =>
        call<T>($fetch(path, { ...options, method: "PATCH", body }));

      return {
        subscriptions: {
          listPlans: (options) => get<ListPlansResponse>("/subscriptions/plans", options),
          getMySubscription: (options) => get<SubscriptionWithAdvantages>("/subscriptions/me", options),
          subscribe: (data, options) => post<{ subscription: Subscription }>("/subscriptions/subscribe", data, options),
          changePlan: (data, options) => post<{ subscription: Subscription }>("/subscriptions/change-plan", data, options),
          cancelSubscription: (data, options) => post<{ subscription: Subscription }>("/subscriptions/cancel", data, options),
          validatePromoCode: (data, options) => post<{ promo: PromoCode }>("/subscriptions/promo-codes/validate", data, options),
          requestCustomSubscription: (data, options) =>
            post<{ request: CustomSubscriptionRequest }>("/subscriptions/custom-requests", data, options),
          recordUsage: (data, options) => post<UsageCheckResult>("/subscriptions/usage/record", data, options),

          listAdvantages: (options) => get<{ advantages: Advantage[] }>("/subscriptions/advantages", options),
          createAdvantage: (data, options) => post<{ advantage: Advantage }>("/subscriptions/advantages", data, options),
          updateAdvantage: (key, data, options) =>
            patch<{ advantage: Advantage }>(`/subscriptions/advantages/${encodeURIComponent(key)}`, data, options),
          createPlan: (data, options) => post<{ plan: Plan }>("/subscriptions/plans", data, options),
          updatePlan: (slug, data, options) =>
            patch<{ plan: Plan }>(`/subscriptions/plans/${encodeURIComponent(slug)}`, data, options),
          createPromoCode: (data, options) => post<{ promo: PromoCode }>("/subscriptions/promo-codes", data, options),
          createPartner: (data, options) => post<{ partner: Partner }>("/subscriptions/partners", data, options),
          createPartnerPlan: (partnerId, data, options) =>
            post<{ plan: Plan }>(`/subscriptions/partners/${encodeURIComponent(partnerId)}/plans`, data, options),
          listPendingCustomRequests: (options) =>
            get<{ requests: CustomSubscriptionRequest[] }>("/subscriptions/custom-requests/pending", options),
          approveCustomRequest: (id, data, options) =>
            post<{ subscription: Subscription }>(
              `/subscriptions/custom-requests/${encodeURIComponent(id)}/approve`,
              data ?? {},
              options,
            ),
          rejectCustomRequest: (id, data, options) =>
            post<{ request: CustomSubscriptionRequest }>(
              `/subscriptions/custom-requests/${encodeURIComponent(id)}/reject`,
              data ?? {},
              options,
            ),
          listPendingSubscriptions: (options) =>
            get<{ subscriptions: Subscription[] }>("/subscriptions/pending", options),
          approveSubscription: (id, options) =>
            post<{ subscription: Subscription }>(`/subscriptions/${encodeURIComponent(id)}/approve`, {}, options),
          rejectSubscription: (id, data, options) =>
            post<{ subscription: Subscription }>(
              `/subscriptions/${encodeURIComponent(id)}/reject`,
              data ?? {},
              options,
            ),
          authorizeOverage: (data, options) =>
            post<{ authorization: unknown }>("/subscriptions/overage/authorize", data, options),
          listAuditLogs: (params, options) =>
            get<{ logs: AuditLog[] }>("/subscriptions/audit-logs", {
              ...options,
              query: params,
            }),
        },
      };
    },
  } satisfies BetterAuthClientPlugin;

  return plugin;
}

async function unwrap<T>(result: Promise<ClientResponse<T>>): Promise<T> {
  const { data, error } = await result;
  if (error) {
    throw new Error(error.message ?? `Request failed${error.status ? ` (${error.status})` : ""}`);
  }
  return data as T;
}

/**
 * Wrapper utilitaire pour consommer les actions sans gérer `{ data, error }`.
 * Préférez `authClient.subscriptions.*` pour un contrôle fin des erreurs.
 */
export function useSubscriptions(client: {
  subscriptions?: SubscriptionsClientActions["subscriptions"];
}) {
  if (!client.subscriptions) {
    throw new Error(
      "Le plugin client subscriptions n'est pas enregistré : ajoutez subscriptionsPlugin() à createAuthClient().",
    );
  }
  const actions = client.subscriptions;

  return {
    listPlans: () => unwrap(actions.listPlans()),
    getMySubscription: () => unwrap(actions.getMySubscription()),
    subscribe: (params: SubscribePayload) => unwrap(actions.subscribe(params)),
    changePlan: (params: ChangePlanPayload) => unwrap(actions.changePlan(params)),
    cancelSubscription: (params: CancelSubscriptionPayload) =>
      unwrap(actions.cancelSubscription(params)),
    validatePromoCode: (params: ValidatePromoCodePayload) =>
      unwrap(actions.validatePromoCode(params)),
    requestCustomSubscription: (params: RequestCustomSubscriptionPayload) =>
      unwrap(actions.requestCustomSubscription(params)),
    recordUsage: (params: RecordUsagePayload) => unwrap(actions.recordUsage(params)),
    createPromoCode: (params: CreatePromoCodePayload) =>
      unwrap(actions.createPromoCode(params)),
  };
}
