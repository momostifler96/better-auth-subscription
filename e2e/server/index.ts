/**
 * Serveur E2E : Better Auth + plugin better-subscriptions + SQLite natif.
 *
 * - La base est recréée à chaque démarrage (E2E_KEEP_DB=1 pour la conserver).
 * - Un compte admin est créé automatiquement et promu via SQL.
 * - Les sources du plugin sont importées directement (tsx), sans build.
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
} from "../../src/index.js";

process.on("unhandledRejection", (reason) => {
  console.error("[e2e][unhandledRejection]", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[e2e][uncaughtException]", error);
});

const PORT = Number(process.env.PORT ?? 3100);
const BASE_URL = process.env.BETTER_AUTH_URL ?? `http://localhost:${PORT}`;
const DB_PATH = resolve(process.cwd(), process.env.E2E_DB ?? "data/e2e.db");

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
  // Le parcours E2E React existant teste le provider manual en activation
  // immédiate. L'app Vue teste le flux sécurisé par défaut (approbation admin).
  requireManualApproval: false,
});

export const auth = betterAuth({
  appName: "better-subscriptions-e2e",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "e2e-secret-0123456789abcdef0123456789abcdef",
  baseURL: BASE_URL,
  basePath: "/api/auth",
  trustedOrigins: [
    BASE_URL,
    "http://localhost:3100",
    "http://127.0.0.1:3100",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
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
  plugins: [subscriptions],
  logger: {
    disabled: false,
    level: "warn",
  },
});

// Migrations Better Auth (tables user/session/account + tables du plugin).
const ctx = await auth.$context;
await ctx.runMigrations();

// Compte admin de test.
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
      name: "E2E Admin",
    },
  });
}
db.prepare("UPDATE user SET role = 'admin' WHERE email = ?").run(ADMIN_EMAIL);

console.log(`[e2e] base SQLite : ${DB_PATH}`);
console.log(`[e2e] admin       : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
console.log(`[e2e] URL        : ${BASE_URL}`);

const app = new Hono();

app.get("/healthz", (c) => c.json({ ok: true }));

app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ path: "./dist/index.html" }));

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[e2e] serveur prêt sur http://localhost:${info.port}`);
});
