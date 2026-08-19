# better-subscriptions

Plugin d'abonnements avancé pour [Better Auth](https://www.better-auth.com/), écrit en TypeScript.

Il ajoute à Better Auth tout ce qu'il manque pour piloter des offres SaaS complexes :

- **Provider de paiement pluggable** : Stripe, Paddle, Lemon Squeezy et un provider "manuel" (hors-ligne) sont fournis ; en ajouter un nouveau ne touche à aucune logique métier (interface `PaymentProvider`).
- **Codes promo** : pourcentage, montant fixe, période gratuite, extension d'essai — avec limites d'usage globales et par utilisateur, fenêtres de validité, restriction à certains plans/partenaires.
- **Souscriptions personnalisées à la demande** : un utilisateur (ou un commercial) soumet une demande avec les avantages souhaités, un admin l'approuve ou la rejette ; l'approbation crée automatiquement un plan privé et la souscription correspondante.
- **Plans partenaires** : gratuits (aucun paiement, provider "manual" forcé) ou payants (remise automatique, partage de revenu), invisibles du catalogue public.
- **Sélection d'avantages personnalisée** : bibliothèque d'avantages réutilisables (booléens ou quantités), assemblés librement par plan, avec possibilité de surcharge au niveau d'une souscription individuelle.
- **Dépassements autorisés** : toute consommation au-delà de la limite du plan est bloquée tant qu'un administrateur n'a pas explicitement enregistré une autorisation (motif, plafond additionnel ou illimité, expiration optionnelle).
- **Journal d'audit** : chaque mutation sensible (création de plan/promo/partenaire, souscription, changement de plan, annulation, rédemption de code promo, autorisation de dépassement, revue de demande personnalisée) est journalisée avec l'auteur, l'état avant/après, l'IP et le user-agent.

## Architecture

```
src/
  types/domain.ts          Types de domaine partagés (Plan, Subscription, PromoCode, ...)
  schema/drizzle.ts         Schéma Postgres de référence (Drizzle)
  repositories/
    interfaces.ts           Ports de persistance (indépendants du stockage)
    memory/store.ts          Implémentation 100% mémoire (dev/tests/démo)
  providers/
    types.ts                Interface PaymentProvider commune à tous les providers
    stripe.ts / paddle.ts / lemonsqueezy.ts / manual.ts
    registry.ts              Registre multi-provider
  services/
    audit-service.ts         Journal d'audit (append-only)
    plan-service.ts           Catalogue de plans + bibliothèque d'avantages
    promo-service.ts          Codes promo (création, validation, rédemption)
    partner-service.ts        Partenaires + plans partenaires
    subscription-service.ts   Cycle de vie des souscriptions + demandes personnalisées
    overage-service.ts        Usage & dépassements autorisés
  plugin/
    services.ts               Assemble tous les services à partir d'un store + d'un registre de providers
    index.ts                  Plugin Better Auth (endpoints HTTP)
  index.ts                    Point d'entrée public du package
scripts/demo.ts               Démo bout-en-bout sans HTTP (`npm run demo`)
```

La logique métier (`services/*`) ne dépend **que** des interfaces de `repositories/interfaces.ts` et `providers/types.ts` : le plugin Better Auth n'est qu'une fine couche HTTP par-dessus. Vous pouvez utiliser les services directement dans des scripts d'admin, des jobs planifiés, du GraphQL, etc.

## Installation

```bash
npm install better-subscriptions better-auth drizzle-orm zod
```

## Utilisation avec Better Auth

```ts
import { betterAuth } from "better-auth";
import {
  subscriptionsPlugin,
  PaymentProviderRegistry,
  StripePaymentProvider,
  ManualPaymentProvider,
} from "better-subscriptions";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const providers = new PaymentProviderRegistry()
  .register(
    new StripePaymentProvider({ client: stripe, webhookSecret: process.env.STRIPE_WEBHOOK_SECRET! }),
    { asDefault: true },
  )
  .register(new ManualPaymentProvider()); // requis pour les plans partenaires gratuits et le custom hors-ligne

const { plugin: subscriptions, services } = subscriptionsPlugin({
  providers,
  isAdmin: (user) => user.role === "admin", // adaptez à votre modèle de rôles
  // store: monStoreDrizzle, // par défaut : store mémoire (dev uniquement)
});

export const auth = betterAuth({
  // ... votre config Better Auth existante
  plugins: [subscriptions],
});

// `services` expose PlanService, PromoService, PartnerService, SubscriptionService,
// OverageService et AuditService pour vos scripts d'admin / jobs planifiés.
export const subscriptionServices = services;
```

### Persistance en production

Un store 100% mémoire est fourni pour le développement et les tests (`createMemoryStore()`), mais il ne survit pas à un redémarrage. Pour la production, implémentez `SubscriptionStore` (voir `src/repositories/interfaces.ts`) — par exemple avec Drizzle, en vous appuyant sur le schéma Postgres de référence fourni dans `src/schema/drizzle.ts` — et passez-le via `subscriptionsPlugin({ store: monStore, providers })`.

## Endpoints exposés

Toutes les routes sont préfixées par le chemin de base de Better Auth (`/api/auth` par défaut).

| Méthode | Chemin | Accès | Description |
|---|---|---|---|
| GET | `/subscriptions/plans` | public | Catalogue des plans publics |
| POST | `/subscriptions/plans` | admin | Créer un plan (standard/custom/partner) avec sa sélection d'avantages |
| POST | `/subscriptions/advantages` | admin | Créer un avantage réutilisable (booléen ou quantité) |
| GET | `/subscriptions/me` | utilisateur | Souscription active + avantages effectifs |
| POST | `/subscriptions/subscribe` | utilisateur | Souscrire à un plan (provider + code promo au choix) |
| POST | `/subscriptions/change-plan` | utilisateur/admin | Changer de plan |
| POST | `/subscriptions/cancel` | utilisateur/admin | Annuler (immédiatement ou en fin de période) |
| POST | `/subscriptions/custom-requests` | utilisateur | Demander une souscription personnalisée |
| GET | `/subscriptions/custom-requests/pending` | admin | Lister les demandes en attente |
| POST | `/subscriptions/custom-requests/:id/approve` | admin | Approuver → provisionne plan + souscription |
| POST | `/subscriptions/custom-requests/:id/reject` | admin | Rejeter |
| POST | `/subscriptions/promo-codes` | admin | Créer un code promo |
| POST | `/subscriptions/promo-codes/validate` | utilisateur | Valider un code sans le consommer |
| POST | `/subscriptions/partners` | admin | Créer un partenaire (free/paid) |
| POST | `/subscriptions/partners/:id/plans` | admin | Créer un plan pour ce partenaire |
| POST | `/subscriptions/usage/record` | utilisateur/admin | Enregistrer une consommation (bloque si hors-limite non autorisée) |
| POST | `/subscriptions/overage/authorize` | admin | Autoriser un dépassement (motif obligatoire) |
| GET | `/subscriptions/audit-logs` | admin | Consulter le journal d'audit |
| POST | `/subscriptions/webhooks/:provider` | public (signature vérifiée) | Webhook Stripe/Paddle/Lemon Squeezy |

## Ajouter un provider de paiement

Implémentez l'interface `PaymentProvider` (`src/providers/types.ts`) : `createCustomer`, `createSubscription`, `updateSubscription`, `cancelSubscription`, `ensurePromoCode`, `verifyAndParseWebhook`, et optionnellement `reportUsage` pour la facturation à l'usage des dépassements. Enregistrez-le dans le `PaymentProviderRegistry` : aucune autre partie du code n'a besoin de changer.

## Démo locale

```bash
npm install
npm run demo      # exécute scripts/demo.ts : plans, promo, souscription personnalisée,
                   # plan partenaire gratuit, dépassement bloqué puis autorisé, audit log
npm run typecheck # tsc --noEmit
```

## Notes de sécurité

- Le journal d'audit est **append-only** : aucune méthode d'update/delete n'existe sur `AuditLogRepository.append`.
- Toute tentative de mutation sensible est journalisée même en cas d'échec (`AuditService.wrap` capture l'erreur avant de la relancer).
- Aucun dépassement d'usage n'est jamais autorisé implicitement : `OverageService.recordUsage` exige une `OverageAuthorization` active et suffisante, sinon il lève une erreur bloquante.
- Les webhooks vérifient la signature du provider avant tout traitement (`verifyAndParseWebhook`).
