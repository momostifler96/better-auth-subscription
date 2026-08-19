# Guide des types TypeScript

Ce guide documente tous les types TypeScript disponibles dans le plugin subscriptions.

## Imports

```typescript
import type {
  // Types de base
  Plan,
  PlanPrice,
  Advantage,
  AdvantageSelection,
  PlanAdvantage,
  
  // Abonnements
  Subscription,
  SubscriptionWithAdvantages,
  PlanAdvantageWithDetail,
  AdvantageValue,
  
  // Demandes personnalisées
  CustomSubscriptionRequest,
  
  // Codes promo
  PromoCode,
  PromoRedemption,
  PromoCodeValidation,
  
  // Partenaires
  Partner,
  
  // Utilisation et dépassements
  UsageRecord,
  OverageAuthorization,
  
  // Audit
  AuditLog,
  
  // Types de réponses API
  ListPlansResponse,
  GetMySubscriptionResponse,
  SubscribeResponse,
  ValidatePromoCodeResponse,
  // ...
  
  // Types de requêtes (payloads)
  SubscribePayload,
  CreatePlanPayload,
  // ...
  
  // Types utilitaires
  SubscriptionStatus,
  PromoCodeType,
  BillingMode,
  PlanKind,
  ActorType,
  CustomRequestStatus,
} from "better-subscriptions/client";
```

## Types de base

### `Plan`

Structure complète d'un plan d'abonnement.

```typescript
interface Plan {
  id: string;
  slug: string;
  name: string;
  description?: string;
  kind: "standard" | "custom" | "partner";
  isPublic: boolean;
  isActive: boolean;
  prices: PlanPrice[];
  partnerId?: string;
  organizationId?: string;
  originRequestId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Exemple:**
```typescript
const plan: Plan = {
  id: "plan_1",
  slug: "pro",
  name: "Plan Pro",
  kind: "standard",
  isPublic: true,
  isActive: true,
  prices: [
    {
      provider: "stripe",
      externalPriceId: "price_123",
      currency: "USD",
      amountCents: 9999,
      interval: "month",
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### `PlanPrice`

Détails de prix d'un plan pour un provider spécifique.

```typescript
interface PlanPrice {
  provider: string;
  externalPriceId: string;
  currency: string;
  amountCents: number;
  interval: "month" | "year" | "one_time" | "custom";
}
```

### `Advantage`

Avantage disponible dans les plans.

```typescript
interface Advantage {
  id: string;
  key: string;
  name: string;
  description?: string;
  valueType: "boolean" | "quantity";
  unit?: string;
  createdAt: Date;
}
```

**Exemple:**
```typescript
const advantage: Advantage = {
  id: "adv_1",
  key: "api_calls",
  name: "Appels API",
  valueType: "quantity",
  unit: "appels/mois",
  createdAt: new Date(),
};
```

### `AdvantageSelection`

Sélection d'un avantage lors de la création ou modification d'un plan.

```typescript
interface AdvantageSelection {
  advantageKey: string;
  value: boolean | number | null;
  overageAllowed?: boolean;
  overageUnitPriceCents?: number;
}
```

## Types d'abonnement

### `Subscription`

État complet d'un abonnement utilisateur.

```typescript
interface Subscription {
  id: string;
  userId?: string;
  organizationId?: string;
  planId: string;
  status: "active" | "paused" | "canceled" | "trialing" | "expired";
  provider: string;
  externalSubscriptionId?: string;
  externalCustomerId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  advantageOverrides: Record<string, AdvantageValue>;
  appliedPromoCodeId?: string;
  partnerId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  plan?: Plan;
  promoCode?: PromoCode;
  partner?: Partner;
}
```

**Exemple:**
```typescript
const subscription: Subscription = {
  id: "sub_1",
  userId: "user_123",
  planId: "plan_1",
  status: "active",
  provider: "stripe",
  externalSubscriptionId: "sub_stripe_123",
  currentPeriodStart: new Date(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  cancelAtPeriodEnd: false,
  advantageOverrides: {
    api_calls: 10000,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### `SubscriptionWithAdvantages`

Abonnement avec la liste détaillée de ses avantages.

```typescript
interface SubscriptionWithAdvantages {
  subscription: Subscription | null;
  advantages: PlanAdvantageWithDetail[];
}

interface PlanAdvantageWithDetail {
  advantage: Advantage;
  value: AdvantageValue;
  overageAllowed: boolean;
  overageUnitPriceCents?: number;
}
```

**Exemple:**
```typescript
const subWithAdvantages: SubscriptionWithAdvantages = {
  subscription: { /* ... */ },
  advantages: [
    {
      advantage: {
        id: "adv_1",
        key: "api_calls",
        name: "Appels API",
        valueType: "quantity",
        unit: "appels/mois",
        createdAt: new Date(),
      },
      value: 10000,
      overageAllowed: true,
      overageUnitPriceCents: 10,
    },
  ],
};
```

## Types de codes promo

### `PromoCode`

Code promotionnel disponible.

```typescript
interface PromoCode {
  id: string;
  code: string;
  type: "percent" | "fixed" | "free_period" | "trial_extension";
  value: number;
  currency?: string;
  description?: string;
  maxRedemptions?: number;
  redemptionCount: number;
  perUserLimit?: number;
  validFrom: Date;
  validUntil?: Date;
  applicablePlanIds: string[];
  applicablePartnerIds: string[];
  isActive: boolean;
  createdAt: Date;
  createdByUserId: string;
  createdBy?: { id: string; name: string; email: string };
}
```

**Exemple:**
```typescript
const promoCode: PromoCode = {
  id: "promo_1",
  code: "SAVE20",
  type: "percent",
  value: 20,
  validFrom: new Date(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  applicablePlanIds: ["plan_1", "plan_2"],
  applicablePartnerIds: [],
  isActive: true,
  redemptionCount: 5,
  perUserLimit: 1,
  createdAt: new Date(),
  createdByUserId: "admin_1",
};
```

### `PromoRedemption`

Utilisation d'un code promo par un utilisateur.

```typescript
interface PromoRedemption {
  id: string;
  promoCodeId: string;
  userId: string;
  subscriptionId: string;
  redeemedAt: Date;
  promoCode?: PromoCode;
  user?: { id: string; name: string; email: string };
  subscription?: Subscription;
}
```

## Types de demandes personnalisées

### `CustomSubscriptionRequest`

Demande d'abonnement personnalisé par un utilisateur.

```typescript
interface CustomSubscriptionRequest {
  id: string;
  requestedByUserId?: string;
  requestedByOrganizationId?: string;
  requestedAdvantages: AdvantageSelection[];
  proposedPriceCents?: number;
  proposedCurrency?: string;
  proposedInterval?: "month" | "year" | "one_time" | "custom";
  justification?: string;
  status: "pending" | "approved" | "rejected";
  reviewedByUserId?: string;
  reviewNotes?: string;
  resultingPlanId?: string;
  resultingSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
  requestedBy?: { id: string; name: string; email: string };
  reviewedBy?: { id: string; name: string; email: string };
}
```

**Exemple:**
```typescript
const customRequest: CustomSubscriptionRequest = {
  id: "req_1",
  requestedByUserId: "user_123",
  requestedAdvantages: [
    { advantageKey: "api_calls", value: 50000 },
    { advantageKey: "custom_domain", value: true },
  ],
  proposedPriceCents: 50000,
  proposedCurrency: "USD",
  proposedInterval: "month",
  justification: "Need more capacity for growth",
  status: "pending",
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

## Types de partenaires

### `Partner`

Partenaire ayant des plans associés.

```typescript
interface Partner {
  id: string;
  name: string;
  slug: string;
  billingMode: "free" | "paid";
  discountPercent: number;
  revenueSharePercent?: number;
  contactEmail?: string;
  notes?: string;
  organizationId?: string;
  isActive: boolean;
  createdAt: Date;
}
```

## Types d'utilisation et dépassements

### `UsageRecord`

Enregistrement de l'utilisation d'un avantage.

```typescript
interface UsageRecord {
  id: string;
  subscriptionId: string;
  advantageKey: string;
  quantity: number;
  periodStart: Date;
  periodEnd: Date;
  recordedAt: Date;
  subscription?: Subscription;
  advantage?: Advantage;
}
```

### `OverageAuthorization`

Autorisation de dépassement pour un avantage.

```typescript
interface OverageAuthorization {
  id: string;
  subscriptionId: string;
  advantageKey: string;
  authorizedExtraLimit?: number;
  reason: string;
  authorizedByUserId: string;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  subscription?: Subscription;
  advantage?: Advantage;
  authorizedBy?: { id: string; name: string; email: string };
}
```

## Types d'audit

### `AuditLog`

Enregistrement d'une action dans le système.

```typescript
interface AuditLog {
  id: string;
  actorId: string;
  actorType: "user" | "admin" | "system";
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
  actor?: { id: string; name: string; email: string };
}
```

## Types de payloads (requêtes)

### `SubscribePayload`

Paramètres pour s'abonner à un plan.

```typescript
interface SubscribePayload {
  planId: string;
  provider?: string;
  promoCode?: string;
  quantity?: number;
}
```

### `CreatePlanPayload`

Paramètres pour créer un plan.

```typescript
interface CreatePlanPayload {
  slug: string;
  name: string;
  description?: string;
  kind?: "standard" | "custom" | "partner";
  isPublic?: boolean;
  prices?: PlanPrice[];
  partnerId?: string;
  advantages?: AdvantageSelection[];
}
```

## Types d'énumération (Union types)

### `SubscriptionStatus`

États possibles d'un abonnement.

```typescript
type SubscriptionStatus = "active" | "paused" | "canceled" | "trialing" | "expired";
```

### `PromoCodeType`

Types de codes promo disponibles.

```typescript
type PromoCodeType = "percent" | "fixed" | "free_period" | "trial_extension";
```

### `BillingMode`

Mode de facturation d'un partenaire.

```typescript
type BillingMode = "free" | "paid";
```

### `PlanKind`

Type de plan.

```typescript
type PlanKind = "standard" | "custom" | "partner";
```

### `ActorType`

Type d'acteur dans les logs d'audit.

```typescript
type ActorType = "user" | "admin" | "system";
```

## Type-safety en action

### React avec types

```typescript
import type { Plan, SubscribePayload } from "better-subscriptions/client";
import { useSubscribe, usePlans } from "better-subscriptions/client/react";

function PlanCard({ plan }: { plan: Plan }) {
  const { subscribe, isLoading, error } = useSubscribe(authClient);

  const handleSubscribe = async () => {
    const payload: SubscribePayload = {
      planId: plan.id,
      provider: "stripe",
    };
    
    await subscribe(payload);
  };

  return (
    <button onClick={handleSubscribe} disabled={isLoading}>
      S'abonner
    </button>
  );
}
```

### Validation des types

```typescript
import type { SubscriptionStatus, Subscription } from "better-subscriptions/client";

function getSubscriptionLabel(subscription: Subscription): string {
  const statusLabels: Record<SubscriptionStatus, string> = {
    active: "Actif",
    paused: "En pause",
    canceled: "Annulé",
    trialing: "Essai",
    expired: "Expiré",
  };
  
  return statusLabels[subscription.status];
}
```

## Voir aussi

- [Guide du client](./CLIENT_GUIDE.md)
- [Guide d'intégration](./INTEGRATION_GUIDE.md)
