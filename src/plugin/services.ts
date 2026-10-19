import type { SubscriptionStore } from "../repositories/interfaces.js";
import { createMemoryStore } from "../repositories/memory/store.js";
import { createAdapterStore } from "../repositories/adapter/adapter-store.js";
import type { PaymentProviderRegistry } from "../providers/registry.js";
import { AuditService } from "../services/audit-service.js";
import { PlanService } from "../services/plan-service.js";
import { PromoService } from "../services/promo-service.js";
import { PartnerService } from "../services/partner-service.js";
import { SubscriptionService } from "../services/subscription-service.js";
import { OverageService } from "../services/overage-service.js";

export interface SubscriptionsPluginOptions {
  /** Store de persistance. Par défaut : store mémoire (dev/démo uniquement, ne survit pas au redémarrage). */
  store?: SubscriptionStore;
  /** Registre des providers de paiement (Stripe, Paddle, Lemon Squeezy, manual, ...). */
  providers: PaymentProviderRegistry;
  /** Détermine si un utilisateur de session a les droits d'administration sur le module abonnements. */
  isAdmin?: (user: Record<string, unknown> & { id: string }) => boolean;
  /** Indique si le plugin organization de Better Auth est activé. Ajoute le support des abonnements au niveau organisation. */
  enableOrganizations?: boolean;
  /**
   * Exige une approbation admin pour les souscriptions payantes via le
   * provider `manual` (virement, facture...). Activé par défaut : une preuve
   * de paiement déclarative ne suffit pas à obtenir les avantages.
   */
  requireManualApproval?: boolean;
}

export interface SubscriptionServices {
  store: SubscriptionStore;
  audit: AuditService;
  plans: PlanService;
  promos: PromoService;
  partners: PartnerService;
  subscriptions: SubscriptionService;
  overage: OverageService;
}

/**
 * Construit l'ensemble des services métier à partir d'un store et d'un
 * registre de providers partagés. Appelez cette fonction une seule fois
 * (ou passez le même `store`/`providers` à `subscriptionsPlugin`) afin que
 * le plugin Better Auth et le reste de votre backend (scripts d'admin, jobs
 * planifiés, etc.) partagent le même état.
 */
export function createSubscriptionServices(options: SubscriptionsPluginOptions): SubscriptionServices {
  const store = options.store ?? createMemoryStore();
  const audit = new AuditService(store.auditLogs);
  const plans = new PlanService(store, audit);
  const promos = new PromoService(store, audit);
  const partners = new PartnerService(store, audit, plans);
  const subscriptions = new SubscriptionService(store, audit, options.providers, plans, promos, {
    requireManualApproval: options.requireManualApproval ?? true,
  });
  const overage = new OverageService(store, audit, plans, options.providers);
  return { store, audit, plans, promos, partners, subscriptions, overage };
}

/**
 * Crée les services avec l'adaptateur Better Auth pour la requête actuelle.
 * Utilise le schema du plugin pour accéder à la base de données du projet.
 */
export function createSubscriptionServicesWithAdapter(
  adapter: any,
  providers: PaymentProviderRegistry,
  options: { requireManualApproval?: boolean } = {},
): SubscriptionServices {
  const store = createAdapterStore(adapter);
  const audit = new AuditService(store.auditLogs);
  const plans = new PlanService(store, audit);
  const promos = new PromoService(store, audit);
  const partners = new PartnerService(store, audit, plans);
  const subscriptions = new SubscriptionService(store, audit, providers, plans, promos, {
    requireManualApproval: options.requireManualApproval ?? true,
  });
  const overage = new OverageService(store, audit, plans, providers);
  return { store, audit, plans, promos, partners, subscriptions, overage };
}
