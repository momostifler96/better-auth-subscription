/**
 * Serveur de l'app Vue E2E.
 *
 * Importe le package `better-subscriptions` depuis ses exports publiés
 * (`dist`), avec Better Auth + SQLite natif. Le flux manuel sécurisé est
 * activé par défaut : une souscription payante `manual` reste en
 * `pending_approval` jusqu'à validation admin.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { betterAuth } from "better-auth";
import {
  subscriptionsPlugin,
  PaymentProviderRegistry,
  ManualPaymentProvider,
  createSubscriptionServicesWithAdapter,
} from "better-subscriptions";
import type { AuditContext } from "better-subscriptions";

process.on("unhandledRejection", (reason) => {
  console.error("[vue-e2e][unhandledRejection]", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[vue-e2e][uncaughtException]", error);
});

const PORT = Number(process.env.PORT ?? 3200);
const BASE_URL = process.env.BETTER_AUTH_URL ?? `http://localhost:${PORT}`;
const DB_PATH = resolve(process.cwd(), process.env.E2E_DB ?? "data/vue.db");

if (process.env.E2E_KEEP_DB !== "1") {
  rmSync(DB_PATH, { force: true });
}
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

const providers = new PaymentProviderRegistry().register(
  new ManualPaymentProvider(),
  { asDefault: true },
);

const { plugin: subscriptions } = subscriptionsPlugin({
  providers,
  isAdmin: (user) => user.role === "admin",
  // requireManualApproval: true par défaut
});

export const auth = betterAuth({
  appName: "better-subscriptions-vue-e2e",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "vue-e2e-secret-0123456789abcdef0123456789abcdef",
  baseURL: BASE_URL,
  basePath: "/api/auth",
  trustedOrigins: [
    BASE_URL,
    "http://localhost:3200",
    "http://127.0.0.1:3200",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
  ],
  database: db as never,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
        returned: true,
      },
    },
  },
  // Le package local et l'app ont chacun leur copie de better-auth (dépendance
  // file:..) : les types BetterAuthPlugin ne sont pas nominalement identiques.
  // Le runtime est identique (même version), d'où le cast limité au harness.
  plugins: [subscriptions as any],
  logger: { disabled: false, level: "warn" },
});

const ctx = await auth.$context;
await ctx.runMigrations();

const ADMIN_EMAIL = "admin@e2e.test";
const ADMIN_PASSWORD = "Admin123!";
const existingAdmin = db
  .prepare("SELECT id FROM user WHERE email = ?")
  .get(ADMIN_EMAIL) as { id: string } | undefined;

if (!existingAdmin) {
  await auth.api.signUpEmail({
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: "Vue E2E Admin",
    },
  });
}
db.prepare("UPDATE user SET role = 'admin' WHERE email = ?").run(ADMIN_EMAIL);

const admin = db
  .prepare("SELECT id FROM user WHERE email = ?")
  .get(ADMIN_EMAIL) as { id: string };

const services = createSubscriptionServicesWithAdapter(ctx.adapter, providers);
const adminCtx: AuditContext = {
  actorId: admin.id,
  actorType: "admin",
  ip: "127.0.0.1",
  userAgent: "vue-e2e-seed",
};

async function seedDemoData() {
  const advantages = await services.plans.listAdvantages();
  if (!advantages.some((advantage) => advantage.key === "api_calls_per_month")) {
    await services.plans.createAdvantage(adminCtx, {
      key: "api_calls_per_month",
      name: "Appels API / mois",
      valueType: "quantity",
      unit: "appels",
    });
  }
  if (!advantages.some((advantage) => advantage.key === "export_pdf")) {
    await services.plans.createAdvantage(adminCtx, {
      key: "export_pdf",
      name: "Export PDF",
      valueType: "boolean",
    });
  }

  const plans = await services.plans.listPlans();
  if (!plans.some((plan) => plan.slug === "pro")) {
    await services.plans.createPlan(adminCtx, {
      slug: "pro",
      name: "Pro",
      kind: "standard",
      isPublic: true,
      prices: [
        {
          provider: "manual",
          externalPriceId: "manual",
          currency: "EUR",
          amountCents: 2900,
          interval: "month",
        },
      ],
      advantages: [
        {
          advantageKey: "api_calls_per_month",
          value: 1000,
          overageAllowed: true,
          overageUnitPriceCents: 2,
        },
        { advantageKey: "export_pdf", value: true },
      ],
    });
  }
  if (!plans.some((plan) => plan.slug === "starter")) {
    await services.plans.createPlan(adminCtx, {
      slug: "starter",
      name: "Starter",
      kind: "standard",
      isPublic: true,
      prices: [
        {
          provider: "manual",
          externalPriceId: "manual",
          currency: "EUR",
          amountCents: 900,
          interval: "month",
        },
      ],
      advantages: [
        { advantageKey: "api_calls_per_month", value: 100, overageAllowed: false },
        { advantageKey: "export_pdf", value: false },
      ],
    });
  }

  const promos = await services.promos.list();
  if (!promos.some((promo) => promo.code === "VUE20")) {
    await services.promos.createPromoCode(adminCtx, {
      code: "VUE20",
      type: "percent",
      value: 20,
      maxRedemptions: 100,
    });
  }
}

await seedDemoData();

console.log(`[vue-e2e] base SQLite : ${DB_PATH}`);
console.log(`[vue-e2e] admin       : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
console.log(`[vue-e2e] URL        : ${BASE_URL}`);
console.log("[vue-e2e] plan Pro 29 EUR, promo VUE20, approbation manuelle requise");

const app = new Hono();

app.get("/healthz", (c) => c.json({ ok: true }));
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));
app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ path: "./dist/index.html" }));

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[vue-e2e] serveur prêt sur http://localhost:${info.port}`);
});
