/**
 * Script de démonstration : exerce le cœur métier du module d'abonnements
 * (sans passer par Better Auth / HTTP) pour vérifier que tout s'enchaîne
 * correctement. Lancer avec `npm run demo`.
 */
import { createMemoryStore } from "../src/repositories/memory/store.js";
import { PaymentProviderRegistry } from "../src/providers/registry.js";
import { ManualPaymentProvider } from "../src/providers/manual.js";
import { AuditService } from "../src/services/audit-service.js";
import { PlanService } from "../src/services/plan-service.js";
import { PromoService } from "../src/services/promo-service.js";
import { PartnerService } from "../src/services/partner-service.js";
import { SubscriptionService } from "../src/services/subscription-service.js";
import { OverageService } from "../src/services/overage-service.js";
import type { AuditContext } from "../src/services/audit-service.js";

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  const store = createMemoryStore();
  const providers = new PaymentProviderRegistry().register(new ManualPaymentProvider(), { asDefault: true });

  const audit = new AuditService(store.auditLogs);
  const plans = new PlanService(store, audit);
  const promos = new PromoService(store, audit);
  const partners = new PartnerService(store, audit, plans);
  const subscriptions = new SubscriptionService(store, audit, providers, plans, promos);
  const overage = new OverageService(store, audit, plans, providers);

  const adminCtx: AuditContext = { actorId: "admin_1", actorType: "admin", ip: "10.0.0.1", userAgent: "demo-script" };
  const userCtx: AuditContext = { actorId: "user_1", actorType: "user", ip: "203.0.113.7", userAgent: "demo-script" };

  section("1. Bibliothèque d'avantages");
  await plans.createAdvantage(adminCtx, { key: "api_calls_per_month", name: "Appels API / mois", valueType: "quantity", unit: "appels" });
  await plans.createAdvantage(adminCtx, { key: "export_pdf", name: "Export PDF", valueType: "boolean" });
  console.log((await plans.listAdvantages()).map((a) => a.key));

  section("2. Plan standard avec avantages personnalisés");
  const proPlan = await plans.createPlan(adminCtx, {
    slug: "pro",
    name: "Pro",
    kind: "standard",
    prices: [{ provider: "manual", externalPriceId: "manual", currency: "EUR", amountCents: 2900, interval: "month" }],
    advantages: [
      { advantageKey: "api_calls_per_month", value: 1000, overageAllowed: true, overageUnitPriceCents: 2 },
      { advantageKey: "export_pdf", value: true },
    ],
  });
  console.log(`Plan créé: ${proPlan.slug} (${proPlan.id})`);

  section("3. Code promo -20%");
  await promos.createPromoCode(adminCtx, { code: "LAUNCH20", type: "percent", value: 20, maxRedemptions: 100 });

  section("4. Souscription utilisateur avec code promo");
  const sub = await subscriptions.subscribe(userCtx, { userId: "user_1", email: "user1@example.com", planId: proPlan.id, promoCode: "LAUNCH20" });
  console.log(`Souscription: ${sub.id}, statut=${sub.status}, promo appliqué=${sub.appliedPromoCodeId}`);

  section("5. Souscription personnalisée à la demande");
  const request = await subscriptions.requestCustomSubscription(userCtx, {
    requestedByUserId: "user_2",
    requestedAdvantages: [{ advantageKey: "api_calls_per_month", value: 50000 }],
    proposedPriceCents: 49900,
    proposedCurrency: "EUR",
    proposedInterval: "month",
    justification: "Gros volume attendu, négocié par l'équipe commerciale",
  });
  console.log(`Demande créée: ${request.id} (statut: ${request.status})`);
  const approvedSub = await subscriptions.approveCustomRequest(adminCtx, request.id, {
    reviewedByUserId: adminCtx.actorId,
    reviewNotes: "Approuvé par le CTO",
  });
  console.log(`Souscription personnalisée provisionnée: ${approvedSub.id} sur le plan ${approvedSub.planId}`);

  section("6. Partenaire gratuit + plan partenaire");
  const partner = await partners.createPartner(adminCtx, { name: "Incubateur ACME", slug: "incubateur-acme", billingMode: "free" });
  const partnerPlan = await partners.createPartnerPlan(adminCtx, partner.id, {
    slug: "partner-acme-free",
    name: "Offre partenaire ACME",
    advantages: [{ advantageKey: "api_calls_per_month", value: 5000 }, { advantageKey: "export_pdf", value: true }],
  });
  const partnerSub = await subscriptions.subscribe(userCtx, { userId: "user_3", planId: partnerPlan.id });
  console.log(`Souscription partenaire (gratuite): ${partnerSub.id}, provider=${partnerSub.provider}`);

  section("7. Usage normal (dans la limite)");
  const usage1 = await overage.recordUsage(userCtx, { subscriptionId: sub.id, advantageKey: "api_calls_per_month", quantity: 900 });
  console.log(usage1);

  section("8. Dépassement SANS autorisation -> doit être bloqué");
  try {
    await overage.recordUsage(userCtx, { subscriptionId: sub.id, advantageKey: "api_calls_per_month", quantity: 500 });
    console.log("ERREUR: le dépassement aurait dû être bloqué !");
  } catch (err) {
    console.log(`Bloqué comme attendu: ${(err as Error).message}`);
  }

  section("9. Autorisation de dépassement par un admin");
  await overage.authorizeOverage(adminCtx, {
    subscriptionId: sub.id,
    advantageKey: "api_calls_per_month",
    authorizedExtraLimit: 1000,
    reason: "Pic de trafic exceptionnel accepté par le support",
  });

  section("10. Même dépassement, maintenant AUTORISÉ");
  const usage2 = await overage.recordUsage(userCtx, { subscriptionId: sub.id, advantageKey: "api_calls_per_month", quantity: 500 });
  console.log(usage2);

  section("11. Journal d'audit (dernières entrées)");
  const logs = await audit.query({});
  console.log(`${logs.length} entrées d'audit enregistrées. Dernières actions:`);
  console.log(logs.slice(-8).map((l) => `${l.action} par ${l.actorId} (${l.actorType})`));

  section("Résumé");
  console.log(`OK: ${logs.length} entrées d'audit, ${(await plans.listPlans()).length} plans, ${(await promos.list()).length} code(s) promo.`);
}

main().catch((err) => {
  console.error("Échec du script de démonstration:", err);
  process.exit(1);
});
