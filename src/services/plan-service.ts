import type { SubscriptionStore } from "../repositories/interfaces.js";
import type { Advantage, Plan, PlanAdvantage, PlanKind, PlanPrice, Subscription } from "../types/domain.js";
import type { AuditContext, AuditService } from "./audit-service.js";
import { AlreadyExistsError, NotFoundError, ValidationError } from "../errors.js";

export interface CreateAdvantageInput {
  key: string;
  name: string;
  description?: string;
  valueType: Advantage["valueType"];
  unit?: string;
}

export interface CreatePlanInput {
  slug: string;
  name: string;
  description?: string;
  kind?: PlanKind;
  isPublic?: boolean;
  prices?: PlanPrice[];
  partnerId?: string;
  originRequestId?: string;
  /** Sélection d'avantages personnalisée pour ce plan : clé d'avantage -> valeur/limite. */
  advantages?: Array<{
    advantageKey: string;
    value: boolean | number | null;
    overageAllowed?: boolean;
    overageUnitPriceCents?: number;
  }>;
}

/**
 * Gère le catalogue de plans (standard, personnalisé, partenaire) et la
 * bibliothèque d'avantages réutilisables, ainsi que leur association
 * (c'est ici que se joue la "sélection d'avantages personnalisée" par plan).
 */
export class PlanService {
  constructor(private readonly store: SubscriptionStore, private readonly audit: AuditService) {}

  // ---- Avantages -----------------------------------------------------

  async createAdvantage(ctx: AuditContext, input: CreateAdvantageInput): Promise<Advantage> {
    const existing = await this.store.advantages.findByKey(input.key);
    if (existing) throw new AlreadyExistsError("Advantage", "key", input.key);

    return this.audit.wrap(ctx, { action: "advantage.create", entityType: "advantage", entityId: input.key }, async () => {
      const advantage: Omit<Advantage, "id"> = {
        key: input.key,
        name: input.name,
        description: input.description,
        valueType: input.valueType,
        unit: input.unit,
        createdAt: new Date(),
      };
      return this.store.advantages.create(advantage);
    });
  }
  async  updateAdvantage(ctx: AuditContext, key: string, patch: Partial<Pick<Advantage, "name" | "description" | "valueType" | "unit">>): Promise<Advantage> {
    const before = await this.store.advantages.findByKey(key);
    if (!before) throw new NotFoundError("Advantage", key);
    return this.audit.wrap(ctx, { action: "advantage.update", entityType: "advantage", entityId: key, before }, () =>
      this.store.advantages.update(key, patch),
    );
  }

  async listAdvantages(): Promise<Advantage[]> {
    return this.store.advantages.list();
  }

  // ---- Plans -----------------------------------------------------------

  async createPlan(ctx: AuditContext, input: CreatePlanInput): Promise<Plan> {
    const existing = await this.store.plans.findBySlug(input.slug);
    if (existing) throw new AlreadyExistsError("Plan", "slug", input.slug);

    return this.audit.wrap(ctx, { action: "plan.create", entityType: "plan", entityId: input.slug }, async () => {
      const now = new Date();
      const plan: Omit<Plan, "id"> = {
        slug: input.slug,
        name: input.name,
        description: input.description,
        kind: input.kind ?? "standard",
        isPublic: input.isPublic ?? input.kind !== "custom",
        isActive: true,
        prices: input.prices ?? [],
        partnerId: input.partnerId,
        originRequestId: input.originRequestId,
        createdAt: now,
        updatedAt: now,
      };

      const created = await this.store.plans.create(plan);

      if (input.advantages?.length) {
        created.advantages = await this.setPlanAdvantages(created.id, input.advantages);
      }
      return created;
    });
  }

  async updatePlan(ctx: AuditContext, planId: string, patch: Partial<Pick<Plan, "name" | "description" | "isActive" | "isPublic" | "prices">>): Promise<Plan> {
    const before = await this.store.plans.findById(planId);
    if (!before) throw new NotFoundError("Plan", planId);
    return this.audit.wrap(ctx, { action: "plan.update", entityType: "plan", entityId: planId, before }, () =>
      this.store.plans.update(planId, patch),
    );
  }
  async updatePlanBySlug(ctx: AuditContext, slug: string, patch: Partial<Pick<Plan, "name" | "description" | "isActive" | "isPublic" | "prices">>): Promise<Plan> {
    const before = await this.store.plans.findBySlug(slug);
    if (!before) throw new NotFoundError("Plan", slug);
    return this.audit.wrap(ctx, { action: "plan.update", entityType: "plan", entityId: slug, before }, () =>
      this.store.plans.update(before.id, patch),
    );
  }

  async getPlan(planId: string): Promise<Plan | null> {
    return this.store.plans.findById(planId);
  }

  async listPlans(filter?: { kind?: PlanKind; partnerId?: string; isPublic?: boolean }): Promise<Plan[]> {
    return this.store.plans.list(filter);
  }

  /**
   * Remplace intégralement la sélection d'avantages d'un plan.
   * C'est le point d'entrée pour personnaliser librement ce qu'un plan
   * (standard, custom ou partenaire) inclut : chaque avantage référencé
   * par clé doit déjà exister dans la bibliothèque (`createAdvantage`).
   */
  async setPlanAdvantages(
    planId: string,
    advantages: Array<{ advantageKey: string; value: boolean | number | null; overageAllowed?: boolean;isActive?: boolean; overageUnitPriceCents?: number }>,
  ): Promise<PlanAdvantage[]> {
    const resolved: PlanAdvantage[] = [];
    for (const a of advantages) {
      const advantage = await this.store.advantages.findByKey(a.advantageKey);
      if (!advantage) throw new ValidationError(`Unknown advantage: "${a.advantageKey}". Create it first via createAdvantage()`, { advantageKey: a.advantageKey });
      resolved.push({
        planId,
        advantageId: advantage.id,
        value: a.value,
        isActive: a.isActive == null ? true : a.isActive,
        overageAllowed: a.overageAllowed ?? false,
        overageUnitPriceCents: a.overageUnitPriceCents,
      });
    }
    return this.store.planAdvantages.setForPlan(planId, resolved);
  }

  async getPlanAdvantages(planId: string): Promise<PlanAdvantage[]> {
    return this.store.planAdvantages.listForPlan(planId);
  }

  /**
   * Calcule les avantages "effectifs" d'une souscription : ceux du plan,
   * fusionnés avec les éventuelles surcharges propres à la souscription
   * (`subscription.advantageOverrides`), utilisées par exemple pour offrir
   * un avantage bonus à un client précis sans créer un plan entier.
   */
  async getEffectiveAdvantages(subscription: Pick<Subscription, "planId" | "advantageOverrides">): Promise<PlanAdvantage[]> {
    const planAdvantages = await this.getPlanAdvantages(subscription.planId);
    const merged = new Map<string, PlanAdvantage>();
    for (const pa of planAdvantages) merged.set(pa.advantageId, pa);
    for (const override of subscription.advantageOverrides) merged.set(override.advantageId, override);
    return [...merged.values()];
  }

  async findAdvantageByKey(key: string): Promise<Advantage | null> {
    return this.store.advantages.findByKey(key);
  }
}
