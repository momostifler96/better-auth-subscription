# Guide d'intégration Better Auth + Subscriptions Plugin

## Vue d'ensemble

Le plugin d'abonnements est conçu pour fonctionner avec Better Auth et supporte les abonnements au niveau :
- **Utilisateur** : Abonnements individuels
- **Organisation** : Abonnements au niveau organisation (si le plugin `organization` est actif)

## Configuration basique

```typescript
import { betterAuth } from "better-auth";
import { subscriptionsPlugin } from "better-subscriptions/plugin";
import { organization } from "better-auth/plugins/organization";

const { plugin: subscriptions, services } = subscriptionsPlugin({
  providers: paymentProviders,
  isAdmin: (user) => user.role === "admin",
});

export const auth = betterAuth({
  // ... configuration Better Auth
  plugins: [
    organization(), // Optionnel : pour gérer les organisations
    subscriptions,
  ],
});
```

## Schéma des tables avec organisations

### Tables principales

#### `subscription`
- `userId` (optionnel) : Utilisateur propriétaire (si abonnement utilisateur)
- `organizationId` (optionnel) : Organisation propriétaire (si abonnement organisation)
- **Validation** : Au moins un des deux doit être fourni

**Exemple - Abonnement utilisateur :**
```json
{
  "id": "sub_123",
  "userId": "user_456",
  "organizationId": null,
  "planId": "plan_789",
  "status": "active"
}
```

**Exemple - Abonnement organisation :**
```json
{
  "id": "sub_124",
  "userId": null,
  "organizationId": "org_999",
  "planId": "plan_789",
  "status": "active"
}
```

#### `plan`
- `slug` : Identifiant unique du plan
- `organizationId` (optionnel) : Plan personnalisé créé par une organisation

#### `partner`
- `slug` : Identifiant unique du partenaire
- `organizationId` (optionnel) : Partenaire spécifique à une organisation

#### `customSubscriptionRequest`
- `requestedByUserId` (optionnel) : Demande d'un utilisateur
- `requestedByOrganizationId` (optionnel) : Demande d'une organisation
- **Validation** : Au moins un des deux doit être fourni

## Références entre les tables

### Foreign Keys entre organisation et subscriptions

Si le plugin `organization` est actif, les colonnes suivantes référencent la table `organization` :

```
subscription.organizationId → organization.id (on delete: cascade)
plan.organizationId → organization.id (on delete: cascade)
partner.organizationId → organization.id (on delete: cascade)
customSubscriptionRequest.requestedByOrganizationId → organization.id (on delete: cascade)
```

### Foreign Keys vers les utilisateurs (Better Auth)

```
subscription.userId → user.id (on delete: cascade)
customSubscriptionRequest.requestedByUserId → user.id (on delete: cascade)
customSubscriptionRequest.reviewedByUserId → user.id (on delete: set null)
promoCodes.createdByUserId → user.id (on delete: restrict)
auditLog.actorId → user.id (on delete: restrict)
```

## Cas d'usage

### 1. Abonnement individuel
```typescript
// L'utilisateur John s'abonne au plan "Pro"
await services.subscriptions.subscribe(auditContext, {
  userId: "john_id",
  planId: "plan_pro",
  provider: "stripe",
});
```

### 2. Abonnement organisation
```typescript
// L'organisation TechCorp s'abonne au plan "Enterprise"
await services.subscriptions.subscribe(auditContext, {
  // userId n'est pas fourni
  organizationId: "org_techcorp",
  planId: "plan_enterprise",
  provider: "stripe",
});
```

### 3. Demande d'abonnement personnalisé - utilisateur
```typescript
const request = await services.subscriptions.requestCustomSubscription(auditContext, {
  requestedByUserId: "john_id",
  requestedAdvantages: [...],
});
```

### 4. Demande d'abonnement personnalisé - organisation
```typescript
const request = await services.subscriptions.requestCustomSubscription(auditContext, {
  requestedByOrganizationId: "org_techcorp",
  requestedAdvantages: [...],
});
```

## Migrations

Après configuration du schéma, générez les migrations :

```bash
# Générer le schéma
npx @better-auth/cli@latest generate

# Appliquer les migrations (développement)
npx drizzle-kit push

# Ou en production
npx drizzle-kit migrate
```

## Requêtes utiles

### Obtenir l'abonnement actif d'un utilisateur
```typescript
const sub = await services.subscriptions.getActiveForUser(userId);
```

### Obtenir l'abonnement actif d'une organisation
```typescript
const sub = await db
  .select()
  .from(subscriptions)
  .where(
    and(
      eq(subscriptions.organizationId, organizationId),
      eq(subscriptions.status, "active")
    )
  );
```

### Lister tous les utilisateurs membres d'une organisation avec leur abonnement
```typescript
const result = await db
  .select({
    member: members,
    subscription: subscriptions,
  })
  .from(members)
  .leftJoin(
    subscriptions,
    eq(members.userId, subscriptions.userId)
  )
  .where(eq(members.organizationId, organizationId));
```

## Notes importantes

1. **Validation métier** : Implementez les validations dans vos services métier pour s'assurer :
   - Qu'une souscription a au moins `userId` ou `organizationId`
   - Qu'un utilisateur ne peut modifier que ses propres abonnements (sauf admins)
   - Qu'un membre d'organisation peut gérer l'abonnement org selon ses permissions

2. **Permissions** : Utilisez les hooks du plugin `organization` pour gérer les permissions :
   ```typescript
   // Exemple dans vos endpoints
   const member = await getOrgMember(userId, organizationId);
   if (!member || !hasPermission(member.role, "manage:subscription")) {
     throw error("FORBIDDEN");
   }
   ```

3. **Audit** : Les logs d'audit enregistrent toutes les opérations sur les souscriptions, incluant l'`actorId` (utilisateur qui a effectué l'action).

4. **Cascade on delete** : La suppression d'une organisation entraîne la suppression de :
   - Ses souscriptions
   - Ses plans personnalisés
   - Ses partenaires
   - Ses demandes d'abonnement personnalisé
