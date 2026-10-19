# Plugin Client Better Auth - Subscriptions

Le plugin client pour la gestion des abonnements avec Better Auth.

## Structure

```
src/client/
├── index.ts          # Plugin client principal et réexports des types
├── types.ts          # Tous les types TypeScript
├── react.ts          # Hooks React avec gestion d'état
├── example.tsx       # Exemples d'utilisation
└── README.md         # Ce fichier
```

## Installation rapide

### 1. Configurer le client

```typescript
import { createAuthClient } from "better-auth/client";
import { subscriptionsPlugin } from "better-subscriptions/client";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [subscriptionsPlugin()],
});
```

### 2. Utiliser dans React

```typescript
import { usePlans, useMySubscription } from "better-subscriptions/client/react";

function App() {
  const { data: plans } = usePlans(authClient);
  const { data: subscription } = useMySubscription(authClient);

  return (
    <div>
      <h1>Plans: {plans?.length}</h1>
      {subscription?.subscription && (
        <p>Votre plan: {subscription.subscription.planId}</p>
      )}
    </div>
  );
}
```

## Fichiers

### `types.ts`

Contient **tous** les types TypeScript du système :

- **Types de base** : `Plan`, `Advantage`, `PlanPrice`
- **Abonnements** : `Subscription`, `SubscriptionWithAdvantages`
- **Codes promo** : `PromoCode`, `PromoRedemption`
- **Demandes personnalisées** : `CustomSubscriptionRequest`
- **Partenaires** : `Partner`
- **Utilisation** : `UsageRecord`, `OverageAuthorization`
- **Audit** : `AuditLog`
- **Payloads** : `SubscribePayload`, `CreatePlanPayload`, etc.
- **Types d'énumération** : `SubscriptionStatus`, `PromoCodeType`, `BillingMode`, `PlanKind`

**Importer les types :**
```typescript
import type {
  Plan,
  Subscription,
  PromoCode,
  // ...
} from "better-subscriptions/client";
```

### `index.ts`

Exports :
- `subscriptionsPlugin()` - Plugin à passer à `createAuthClient`; enregistre les actions `authClient.subscriptions.*`
- `useSubscriptions(client)` - Wrapper utilitaire qui déballe `{ data, error }`

### `react.ts`

Hooks React :
- `usePlans(client)` - Récupérer les plans
- `useMySubscription(client)` - Abonnement actif de l'utilisateur
- `useSubscribe(client)` - S'abonner à un plan
- `useChangePlan(client)` - Changer de plan
- `useCancelSubscription(client)` - Annuler l'abonnement
- `useValidatePromoCode(client)` - Valider un code promo
- `useRecordUsage(client)` - Enregistrer l'utilisation
- `useRequestCustomSubscription(client)` - Demander un plan personnalisé

Tous les hooks retournent :
```typescript
{
  data: T | null,
  isLoading: boolean,
  error: Error | null,
  refetch: () => Promise<void>
}
```

### `example.tsx`

Composants React d'exemple :
- `PlansPage` - Liste des plans
- `MySubscriptionPage` - Dashboard d'abonnement
- `PromoCodeValidator` - Validation de code promo
- `SubscriptionHistory` - Historique
- `AdvantagesUsage` - Gestion des avantages

## Guides connexes

- **[CLIENT_GUIDE.md](../CLIENT_GUIDE.md)** - Guide complet d'utilisation du client
- **[TYPES_GUIDE.md](../TYPES_GUIDE.md)** - Détails et exemples des types
- **[INTEGRATION_GUIDE.md](../INTEGRATION_GUIDE.md)** - Configuration serveur
- **[better-auth.com/docs](https://better-auth.com/docs)** - Documentation Better Auth

## Patterns courants

### Récupérer les plans et s'abonner

```typescript
import { usePlans, useSubscribe } from "better-subscriptions/client/react";

function Subscribe() {
  const { data: plans } = usePlans(authClient);
  const { subscribe, isLoading } = useSubscribe(authClient);

  const handleSubscribe = async (planId: string) => {
    await subscribe({ planId, provider: "stripe" });
  };

  return (
    <div>
      {plans?.map(plan => (
        <button key={plan.id} onClick={() => handleSubscribe(plan.id)}>
          {plan.name}
        </button>
      ))}
    </div>
  );
}
```

### Afficher l'abonnement actif

```typescript
function Dashboard() {
  const { data, isLoading, refetch } = useMySubscription(authClient);

  if (isLoading) return <div>Chargement...</div>;
  if (!data?.subscription) return <div>Pas d'abonnement</div>;

  return (
    <div>
      <h2>{data.subscription.status}</h2>
      <p>Fin de période: {data.subscription.currentPeriodEnd.toLocaleDateString()}</p>
      <h3>Avantages ({data.advantages.length})</h3>
      <ul>
        {data.advantages.map(adv => (
          <li key={adv.advantage.id}>{adv.advantage.name}</li>
        ))}
      </ul>
      <button onClick={refetch}>Rafraîchir</button>
    </div>
  );
}
```

### Gestion des erreurs

```typescript
function SafeComponent() {
  const { data, error, isLoading } = usePlans(authClient);

  if (isLoading) return <Skeleton />;
  if (error) {
    return (
      <Alert type="error">
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>
          Réessayer
        </button>
      </Alert>
    );
  }

  return <PlanList plans={data} />;
}
```

## Type-safety

Le client est entièrement typé. TypeScript vous aidera :

```typescript
// ✅ Correct
const sub = await client.subscribe({
  planId: "plan_1",
  provider: "stripe",
});

// ❌ Erreur TypeScript
const sub = await client.subscribe({
  planId: "plan_1",
  unknownField: "stripe", // Property 'unknownField' does not exist
});
```

## Performance

### Limitations de requêtes

```typescript
// Récupérer seulement si l'utilisateur est connecté
const { session } = useSession();
const { data } = useMySubscription(authClient, !!session);
```

### Cache (optionnel avec React Query)

```typescript
import { useQuery } from "@tanstack/react-query";

function usePlansQuery(client: any) {
  return useQuery({
    queryKey: ["plans"],
    queryFn: () => client.$fetch("/subscriptions/plans", { method: "GET" }),
  });
}
```

## Dépannage

### Types manquants

Si vous avez une erreur de type, assurez-vous que vous importez depuis le bon endroit :

```typescript
// ✅ Correct
import type { Plan } from "better-subscriptions/client";

// ❌ Mauvais
import { Plan } from "better-subscriptions/client"; // Pas un runtime export
```

### Client non initialisé

```typescript
// ❌ Erreur
function Component() {
  return usePlans(null); // authClient est requis
}

// ✅ Correct
function Component() {
  return usePlans(authClient);
}
```

### CORS ou réseau

```typescript
// Vérifier la baseURL du client
const authClient = createAuthClient({
  baseURL: "http://localhost:3000", // Adapter à votre serveur
});
```

## Contribuer

Si vous avez des idées pour améliorer le client, n'hésitez pas !

- Ajouter des hooks personnalisés
- Améliorer les types
- Ajouter des exemples
