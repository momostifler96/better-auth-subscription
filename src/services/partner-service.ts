import { newId } from "../repositories/memory/store.js";
import type { SubscriptionStore } from "../repositories/interfaces.js";
import type { Partner, PartnerBillingMode, Plan, PlanPrice } from "../types/domain.js";
import type { AuditContext, AuditService } from "./audit-service.js";
import type { PlanService } from "./plan-service.js";

export interface CreatePartnerInput {
  name: string;
  slug: string;
  billingMode: PartnerBillingMode;
  discountPercent?: number;
  revenueSharePercent?: number;
  contactEmail?: string;
  notes?: string;
}

export interface CreatePartnerPlanInput {
  slug: string;
  name: string;
  description?: string;
  /** Ignoré si le partenaire est en mode "free" (le plan est alors gratuit, provider "manual"). */
  prices?: PlanPrice[];
  advantages?: Array<{ advantageKey: string; value: boolean | number | null; overageAllowed?: boolean; overageUnitPriceCents?: number }>;
}

/**
 * Gère les partenaires ("plan pour partenaires", avec ou sans paiement) et
 * leurs plans dédiés, invisibles du catalogue public standard.
 */
export class PartnerService {
  constructor(private readonly store: SubscriptionStore, private readonly audit: AuditService, private readonly plans: PlanService) {}

  async createPartner(ctx: AuditContext, input: CreatePartnerInput): Promise<Partner> {
    const existing = await this.store.partners.findBySlug(input.slug);
    if (existing) throw new Error(`Un partenaire avec le slug "${input.slug}" existe déjà`);
    if (input.billingMode === "free" && input.revenueSharePercent) {
      throw new Error('Un partage de revenu n\'a pas de sens pour un partenaire en mode "free"');
    }

    return this.audit.wrap(ctx, { action: "partner.create", entityType: "partner", entityId: input.slug }, async () => {
      const partner: Partner = {
        id: newId("partner"),
        name: input.name,
        slug: input.slug,
        billingMode: input.billingMode,
        discountPercent: input.discountPercent ?? 0,
        revenueSharePercent: input.billingMode === "paid" ? input.revenueSharePercent : undefined,
        contactEmail: input.contactEmail,
        notes: input.notes,
        isActive: true,
        createdAt: new Date(),
      };
      return this.store.partners.create(partner);
    });
  }

  async updatePartner(ctx: AuditContext, partnerId: string, patch: Partial<Pick<Partner, "discountPercent" | "revenueSharePercent" | "isActive" | "notes">>): Promise<Partner> {
    const before = await this.store.partners.findById(partnerId);
    if (!before) throw new Error(`Partenaire ${partnerId} introuvable`);
    return this.audit.wrap(ctx, { action: "partner.update", entityType: "partner", entityId: partnerId, before }, () =>
      this.store.partners.update(partnerId, patch),
    );
  }

  async list(): Promise<Partner[]> {
    return this.store.partners.list();
  }

  async getById(id: string): Promise<Partner | null> {
    return this.store.partners.findById(id);
  }

  /**
   * Crée un plan rattaché à un partenaire. Pour un partenaire "free", le plan
   * n'a aucun prix (souscrit exclusivement via le provider "manual"). Pour un
   * partenaire "paid", les prix fournis s'appliquent, la remise partenaire
   * étant appliquée automatiquement au moment de la souscription.
   */
  async createPartnerPlan(ctx: AuditContext, partnerId: string, input: CreatePartnerPlanInput): Promise<Plan> {
    const partner = await this.store.partners.findById(partnerId);
    if (!partner) throw new Error(`Partenaire ${partnerId} introuvable`);

    return this.plans.createPlan(ctx, {
      slug: input.slug,
      name: input.name,
      description: input.description,
      kind: "partner",
      isPublic: false,
      partnerId,
      prices: partner.billingMode === "free" ? [] : input.prices ?? [],
      advantages: input.advantages,
    });
  }

  async listPartnerPlans(partnerId: string): Promise<Plan[]> {
    return this.plans.listPlans({ kind: "partner", partnerId });
  }
}
