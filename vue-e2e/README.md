# better-subscriptions · app Vue E2E

Petite application **Vue 3** qui consomme le package publié
(`better-subscriptions/client/vue`) et vérifie le parcours sécurisé du plugin :

1. catalogue public chargé via le composable `usePlans` ;
2. inscription / connexion Better Auth ;
3. souscription à un plan payant avec le provider `manual` ;
4. statut `pending_approval`, avantages non actifs ;
5. approbation par un admin (actions `authClient.subscriptions.approveSubscription`) ;
6. souscription active, code promo consommé, avantages effectifs ;
7. consommation dans la limite puis dépassement bloqué ;
8. changement de plan et annulation ;
9. persistance après redémarrage du serveur.

## Démarrage

Depuis la racine du dépôt :

```bash
npm install
npm run build          # build du package + de ses clients (dist/)
```

Puis :

```bash
cd vue-e2e
npm install            # better-subscriptions: file:..
npm run build
npm run start          # http://localhost:3200
```

La base `vue-e2e/data/vue.db` est recréée à chaque démarrage, sauf avec
`E2E_KEEP_DB=1`. Le serveur seede :

- deux avantages (`api_calls_per_month`, `export_pdf`) ;
- deux plans (`pro` à 29 EUR/mois, `starter` à 9 EUR/mois) ;
- la promo `VUE20` (-20 %, 100 utilisations) ;
- un compte admin.

| Compte | Identifiants | Rôle |
|---|---|---|
| Admin | `admin@e2e.test` / `Admin123!` | admin |
| Utilisateur | à créer dans l'UI | user |

> Une souscription manuelle payante n'est **pas** activée immédiatement :
> connectez-vous en admin, ouvrez la section Administration, puis approuvez-la.
> Ensuite reconnectez-vous avec l'utilisateur pour voir les avantages.

## Développement

```bash
npm run dev:server   # API sur :3200
npm run dev:client   # Vite sur :5174, proxy /api/auth
```

## Ce que l'app teste réellement

- les sous-chemins publiés du package (`better-subscriptions/client/vue`) ;
- les actions `authClient.subscriptions.*` ;
- les composables Vue (`usePlans`, `useMySubscription`, `useSubscribe`,
  `useChangePlan`, `useCancelSubscription`, `useValidatePromoCode`,
  `useRecordUsage`) ;
- les nouveaux endpoints admin (`/subscriptions/pending`,
  `/subscriptions/:id/approve`, `/subscriptions/:id/reject`) ;
- la validation des preuves de paiement et l'approbation manuelle par défaut.

## Note de typage

Le package est installé en `file:..`. Better Auth est résolu depuis le dépôt
parent par le package et depuis `vue-e2e/node_modules` par l'app : deux copies
de `@better-auth/core` peuvent coexister. Le serveur de test caste le plugin en
`any` uniquement pour cette raison (même version au runtime). Le client Vue et
les composables restent typés par le package.

## Captures

Les captures du parcours sont dans [`screenshots/`](./screenshots) :
état initial, souscription pending, dépassement bloqué.
