# Guide du plugin client subscriptions

Le plugin client permet d'accéder aux fonctionnalités de gestion d'abonnements depuis votre application frontend avec **type-safety**.

## Installation et configuration

### 1. Initialiser le client Better Auth

```typescript
import { createAuthClient } from "better-auth/client";
import { subscriptionsPlugin } from "better-subscriptions/client";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [subscriptionsPlugin()],
});
```

### 2. Utiliser les actions typées

```typescript
const { data: plans, error } = await authClient.subscriptions.listPlans();
const { data: mine } = await authClient.subscriptions.getMySubscription();
```

### 3. Utiliser avec React

```tsx
import { usePlans, useMySubscription } from "better-subscriptions/client/react";

function MyComponent() {
  const { data: plans } = usePlans(authClient);
  const { data: mine } = useMySubscription(authClient);
  // ...
}
```

## Hooks disponibles

### Plans

#### `usePlans()`

Récupère la liste des plans publics.

```typescript
const { data: plans, isLoading, error, refetch } = usePlans(authClient);

if (isLoading) return <div>Chargement...</div>;

return plans?.map(plan => (
  <div key={plan.id}>{plan.name}</div>
));
```

**Returned:**
- `data`: `Plan[] | null`
- `isLoading`: `boolean`
- `error`: `Error | null`
- `refetch`: `() => Promise<void>`

### Abonnements

#### `useMySubscription(enabled?)`

Récupère l'abonnement actif de l'utilisateur connecté.

```typescript
const { data, isLoading, error, refetch } = useMySubscription(authClient, true);

if (!data?.subscription) {
  return <div>Pas d'abonnement</div>;
}

return (
  <div>
    <h2>Abonnement: {data.subscription.planId}</h2>
    <p>Statut: {data.subscription.status}</p>
    <p>Avantages: {data.advantages.length}</p>
  </div>
);
```

**Returned:**
- `data`: `SubscriptionWithAdvantages | null`
  - `subscription`: Objet abonnement
  - `advantages`: Liste des avantages actifs
- `isLoading`: `boolean`
- `error`: `Error | null`
- `refetch`: `() => Promise<void>`

#### `useSubscribe()`

S'abonner à un plan.

```typescript
const { subscribe, isLoading, error, data } = useSubscribe(authClient);

const handleSubscribe = async (planId: string, promoCode?: string) => {
  try {
    await subscribe({
      planId,
      provider: "stripe",
      promoCode,
    });
    console.log("Abonnement créé!");
  } catch (err) {
    console.error("Erreur:", err);
  }
};

return (
  <button onClick={() => handleSubscribe("plan_pro")}>
    S'abonner au plan Pro
  </button>
);
```

**Returned:**
- `subscribe`: `(params) => Promise<Subscription>`
- `isLoading`: `boolean`
- `error`: `Error | null`
- `data`: `Subscription | null`

#### `useChangePlan()`

Changer de plan.

```typescript
const { changePlan, isLoading, error } = useChangePlan(authClient);

const handleChangePlan = async () => {
  try {
    const newSubscription = await changePlan(
      subscriptionId,
      "plan_enterprise"
    );
    console.log("Plan changé!");
  } catch (err) {
    console.error("Erreur:", err);
  }
};
```

**Returned:**
- `changePlan`: `(subscriptionId: string, newPlanId: string) => Promise<Subscription>`
- `isLoading`: `boolean`
- `error`: `Error | null`

#### `useCancelSubscription()`

Annuler l'abonnement.

```typescript
const { cancel, isLoading, error } = useCancelSubscription(authClient);

const handleCancel = async () => {
  try {
    // atPeriodEnd = true : annule à la fin de la période
    // atPeriodEnd = false : annule immédiatement
    await cancel(subscriptionId, true);
    console.log("Abonnement annulé!");
  } catch (err) {
    console.error("Erreur:", err);
  }
};
```

**Returned:**
- `cancel`: `(subscriptionId: string, atPeriodEnd?: boolean) => Promise<Subscription>`
- `isLoading`: `boolean`
- `error`: `Error | null`

### Codes promo

#### `useValidatePromoCode()`

Valider un code promo avant de s'abonner.

```typescript
const { validate, isLoading, error, data } = useValidatePromoCode(authClient);

const handleValidateCode = async (code: string) => {
  try {
    const promo = await validate(code, planId, partnerId);
    console.log("Code valide:", promo);
  } catch (err) {
    console.error("Code invalide:", err);
  }
};
```

**Returned:**
- `validate`: `(code: string, planId?: string, partnerId?: string) => Promise<PromoCode>`
- `isLoading`: `boolean`
- `error`: `Error | null`
- `data`: `PromoCode | null`

### Avantages et utilisation

#### `useRecordUsage()`

Enregistrer l'utilisation d'un avantage.

```typescript
const { record, isLoading, error } = useRecordUsage(authClient);

const handleRecordUsage = async (advantageKey: string, quantity: number) => {
  try {
    await record(subscriptionId, advantageKey, quantity);
    console.log("Utilisation enregistrée!");
  } catch (err) {
    console.error("Erreur:", err);
  }
};
```

**Returned:**
- `record`: `(subscriptionId: string, advantageKey: string, quantity: number) => Promise<void>`
- `isLoading`: `boolean`
- `error`: `Error | null`

#### `useRequestCustomSubscription()`

Demander un abonnement personnalisé.

```typescript
const { request, isLoading, error, data } = useRequestCustomSubscription(authClient);

const handleRequest = async () => {
  try {
    const requestData = await request({
      requestedAdvantages: [
        { advantageKey: "api_calls", value: 10000 },
        { advantageKey: "custom_domain", value: true },
      ],
      proposedPriceCents: 50000,
      proposedCurrency: "USD",
      proposedInterval: "month",
      justification: "We need more API calls for our growth",
    });
    console.log("Demande envoyée!");
  } catch (err) {
    console.error("Erreur:", err);
  }
};
```

**Returned:**
- `request`: `(params) => Promise<CustomSubscriptionRequest>`
- `isLoading`: `boolean`
- `error`: `Error | null`
- `data`: `CustomSubscriptionRequest | null`

## Types

### Plan

```typescript
interface Plan {
  id: string;
  slug: string;
  name: string;
  description?: string;
  kind: "standard" | "custom" | "partner";
  isPublic: boolean;
  isActive: boolean;
  prices: unknown[];
  partnerId?: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Subscription

```typescript
interface Subscription {
  id: string;
  userId?: string;
  organizationId?: string;
  planId: string;
  status: string;
  provider: string;
  externalSubscriptionId?: string;
  externalCustomerId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  advantageOverrides: unknown[];
  appliedPromoCodeId?: string;
  partnerId?: string;
  metadata?: unknown;
  createdAt: Date;
  updatedAt: Date;
}
```

### SubscriptionWithAdvantages

```typescript
interface SubscriptionWithAdvantages {
  subscription: Subscription | null;
  advantages: Array<{
    advantage: Advantage;
    value: boolean | number | null;
    overageAllowed: boolean;
    overageUnitPriceCents?: number;
  }>;
}
```

## Cas d'usage courants

### Afficher la page de tarification

```typescript
export function PricingPage() {
  const { data: plans, isLoading } = usePlans(authClient);

  if (isLoading) return <Skeleton />;

  return (
    <div className="pricing-grid">
      {plans?.map(plan => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}
```

### Afficher le dashboard utilisateur avec abonnement

```typescript
export function Dashboard() {
  const { data } = useMySubscription(authClient);

  if (!data?.subscription) {
    return <NoSubscription />;
  }

  return (
    <div>
      <h1>Mon abonnement</h1>
      <SubscriptionInfo subscription={data.subscription} />
      <AdvantagesList advantages={data.advantages} />
      <UsageTracker subscription={data.subscription} />
    </div>
  );
}
```

### Gérer l'upgrade/downgrade de plan

```typescript
export function PlanUpgrade() {
  const { data: subscription } = useMySubscription(authClient);
  const { data: plans } = usePlans(authClient);
  const { changePlan, isLoading } = useChangePlan(authClient);

  if (!subscription?.subscription || !plans) return null;

  const currentPlan = plans.find(p => p.id === subscription.subscription.planId);
  const upgradePlans = plans.filter(p => p.id !== subscription.subscription.planId);

  return (
    <div>
      <p>Plan actuel: {currentPlan?.name}</p>
      <select onChange={(e) => changePlan(subscription.subscription.id, e.target.value)}>
        <option>Changer de plan</option>
        {upgradePlans.map(plan => (
          <option key={plan.id} value={plan.id}>
            {plan.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

## Gestion des erreurs

Tous les hooks inclus une gestion d'erreur basique. Pour les erreurs personnalisées :

```typescript
const { data, error, refetch } = usePlans(authClient);

if (error) {
  return (
    <div role="alert">
      <h2>Une erreur s'est produite</h2>
      <p>{error.message}</p>
      <button onClick={refetch}>Réessayer</button>
    </div>
  );
}
```

## Performance et cache

Les hooks utilisent `useEffect` pour charger les données au montage. Pour optimiser :

- Mémorisez vos sélecteurs : `useMemo`
- Récupérez conditionnellement : `const { data } = usePlans(authClient, enabled)`
- Utilisez `refetch()` au lieu de re-monter le composant

## Voir aussi

- [Guide d'intégration serveur](./INTEGRATION_GUIDE.md)
- [Exemples complets](./src/client/example.tsx)
- [API Better Auth](https://better-auth.com/docs)
