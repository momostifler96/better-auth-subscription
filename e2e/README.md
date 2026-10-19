# better-subscriptions · application E2E

Application de test bout-en-bout pour le plugin `better-subscriptions`. Elle
lance un vrai serveur [Better Auth](https://www.better-auth.com/) avec le plugin,
une base **SQLite réelle** (`node:sqlite`, sans dépendance native) et une UI
React qui exerce tous les endpoints HTTP du plugin depuis un navigateur.

## Prérequis

- Node.js ≥ 22.5 (`node:sqlite` est utilisé par Better Auth via Kysely).
- Les dépendances du plugin installées à la racine du dépôt
  (`npm install` à la racine), car l'application importe directement
  `src/index.ts` du plugin et résout `better-auth`/`zod` depuis le dépôt parent.

## Démarrage

```bash
# à la racine du dépôt
npm install

# dans e2e/
cd e2e
npm install
npm run build       # build Vite de l'UI
npm run start       # serveur Hono + Better Auth + UI sur http://localhost:3100
```

La base `e2e/data/e2e.db` est **recréée à chaque démarrage**. Pour la conserver :

```bash
E2E_KEEP_DB=1 npm run start
```

Un compte admin est créé et promu automatiquement :

| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@e2e.test` | `Admin123!` | admin |

Pour le développement avec HMR :

```bash
npm run dev:server   # API sur :3100
npm run dev:client   # UI Vite sur :5173, proxy /api/auth vers :3100
```

## Parcours couverts

1. **Catalogue public** : `GET /subscriptions/plans` sans session.
2. **Admin** : création d'avantages (booléen + quantité), de plans standard,
   mise à jour d'un plan (PATCH), codes promo, partenaire gratuit, plan
   partenaire privé.
3. **Utilisateur** : inscription/connexion Better Auth, validation d'un code
   promo, souscription au provider `manual` avec preuve de paiement.
4. **Avantages effectifs** : `GET /subscriptions/me` renvoie le plan et les
   valeurs typées (`1000`, `true`).
5. **Usage** : dans la limite (200), dépassement bloqué (400) sans autorisation,
   autorisation admin, puis dépassement accepté (`usedOverage: true`).
6. **Cycle de vie** : changement de plan, annulation immédiate.
7. **Souscription personnalisée** : demande utilisateur → approbation admin →
   plan privé + souscription provisionnés automatiquement.
8. **Partenaire gratuit** : souscription sans preuve de paiement (provider
   `manual` forcé), alors qu'un plan standard `manual` sans preuve renvoie 400.
9. **Autorisation** : un utilisateur non-admin reçoit 403 sur les endpoints
   admin.
10. **Audit** : journal append-only avec les actions admin et utilisateur,
    y compris les tentatives échouées.
11. **Persistance** : rechargement/ouverture d'un nouvel onglet → session,
    plans, souscription et audit toujours présents (SQLite).

## Endpoints exercés

`GET /subscriptions/plans`, `POST /subscriptions/advantages`,
`GET /subscriptions/advantages`, `POST /subscriptions/plans`,
`PATCH /subscriptions/plans/:slug`, `GET /subscriptions/me`,
`POST /subscriptions/subscribe`, `POST /subscriptions/change-plan`,
`POST /subscriptions/cancel`, `POST /subscriptions/promo-codes`,
`POST /subscriptions/promo-codes/validate`, `POST /subscriptions/partners`,
`POST /subscriptions/partners/:id/plans`, `POST /subscriptions/usage/record`,
`POST /subscriptions/overage/authorize`, `POST /subscriptions/custom-requests`,
`GET /subscriptions/custom-requests/pending`,
`POST /subscriptions/custom-requests/:id/approve`,
`POST /subscriptions/custom-requests/:id/reject`,
`GET /subscriptions/audit-logs`.

## Bugs révélés et corrigés pendant la mise en place

| Bug | Correction |
|---|---|
| `drizzle-orm` manquant alors que `src/index.ts` réexporte le schéma Drizzle → build et import impossibles | ajout en `devDependencies` |
| `adapter.update({ data })` au lieu de `update` (API Better Auth) → toutes les mises à jour échouaient (`promo_code.redeem`, `change-plan`, `cancel`, PATCH…) | clé `update` dans `adapter-store.ts` |
| Valeurs d'avantages stockées en texte (`"1000.0"`, `"1.0"`) → comparaisons de limites faussées | champ texte + `transform` JSON entrée/sortie dans le schéma du plugin |
| `promo.maxRedemptions`/`perUserLimit` à `null` comparés avec `>=` → tout code promo sans limite rejeté | vérifications `!= null` |
| Codes d'erreur métier (`VALIDATION_ERROR`, `ALREADY_EXISTS`…) inconnus de better-call → erreurs renvoyées en HTTP 200 | projection vers les codes HTTP standard (`BAD_REQUEST`, `CONFLICT`, …) |
| `findOne` non attendu avec une jointure invalide dans `GET /subscriptions/plans` → unhandled rejection | suppression de l'appel |
| Plan partenaire gratuit exigeant une preuve de paiement | la preuve n'est exigée que si le partenaire n'est pas `free` |

## Notes sur l'outillage navigateur

Le test a été exécuté avec le navigateur intégré. Sur cette page très longue,
les clics Playwright basés sur l'actionnabilité et les captures plein écran
peuvent expirer ; les interactions ont été faites via des clics coordonnés
(`cua`) après avoir amené l'élément dans la vue, et les captures ont été prises
dans un onglet fraîchement ouvert. Ce sont des limitations de l'outillage, pas
des bugs de l'application : les mêmes actions réussissent en clic réel.
Les captures sont dans [`screenshots/`](./screenshots).
