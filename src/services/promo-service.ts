import type { SubscriptionStore } from "../repositories/interfaces.js";
import type { PromoCode, PromoCodeType } from "../types/domain.js";
import type { AuditContext, AuditService } from "./audit-service.js";
import { NotFoundError, AlreadyExistsError, ValidationError, BadRequestError } from "../errors.js";

export interface CreatePromoCodeInput {
  code: string;
  type: PromoCodeType;
  value: number;
  currency?: string;
  description?: string;
  maxRedemptions?: number;
  perUserLimit?: number;
  validFrom?: Date;
  validUntil?: Date;
  applicablePlanIds?: string[];
  applicablePartnerIds?: string[];
}

export interface ValidatePromoContext {
  userId: string;
  planId?: string;
  partnerId?: string;
}

export interface PromoValidationResult {
  promo: PromoCode;
}

/**
 * Création et validation/rédemption des codes promo. La validation est
 * séparée de la rédemption : `validate()` est un contrôle "à blanc" (utilisé
 * par exemple pour afficher la réduction avant paiement), `redeem()` est
 * l'opération qui consomme réellement le code et est journalisée.
 */
export class PromoService {
  constructor(private readonly store: SubscriptionStore, private readonly audit: AuditService) {}

  async createPromoCode(ctx: AuditContext, input: CreatePromoCodeInput): Promise<PromoCode> {
    const code = input.code.trim().toUpperCase();
    if (!code) throw new BadRequestError("Le code promo ne peut pas être vide");
    const existing = await this.store.promoCodes.findByCode(code);
    if (existing) throw new AlreadyExistsError("PromoCode", "code", code);
    if (input.type === "fixed" && !input.currency) throw new ValidationError('Une devise est requise pour un code promo de type "fixed"', { type: "fixed", hasCurrency: false });
    if (input.value <= 0) throw new ValidationError("La valeur du code promo doit être positive", { value: input.value });

    return this.audit.wrap(ctx, { action: "promo_code.create", entityType: "promo_code", entityId: code }, async () => {
      const promo: Omit<PromoCode, "id"> = {
        code,
        type: input.type,
        value: input.value,
        currency: input.currency,
        description: input.description,
        maxRedemptions: input.maxRedemptions,
        redemptionCount: 0,
        perUserLimit: input.perUserLimit,
        validFrom: input.validFrom ?? new Date(),
        validUntil: input.validUntil,
        applicablePlanIds: input.applicablePlanIds ?? [],
        applicablePartnerIds: input.applicablePartnerIds ?? [],
        isActive: true,
        createdAt: new Date(),
        createdByUserId: ctx.actorId,
      };
      return this.store.promoCodes.create(promo);
    });
  }

  async deactivate(ctx: AuditContext, promoCodeId: string): Promise<PromoCode> {
    const before = await this.store.promoCodes.findById(promoCodeId);
    if (!before) throw new NotFoundError("PromoCode", promoCodeId);
    return this.audit.wrap(ctx, { action: "promo_code.deactivate", entityType: "promo_code", entityId: promoCodeId, before }, () =>
      this.store.promoCodes.update(promoCodeId, { isActive: false }),
    );
  }

  async list(): Promise<PromoCode[]> {
    return this.store.promoCodes.list();
  }

  /** Vérifie qu'un code peut être utilisé dans ce contexte, sans le consommer. */
  async validate(code: string, context: ValidatePromoContext): Promise<PromoValidationResult> {
    const promo = await this.store.promoCodes.findByCode(code);
    if (!promo) throw new NotFoundError("PromoCode", code);
    if (!promo.isActive) throw new BadRequestError(`Le code promo "${promo.code}" n'est plus actif`, { code: promo.code });

    const now = new Date();
    if (promo.validFrom > now) throw new ValidationError(`Le code promo "${promo.code}" n'est pas encore valide`, { code: promo.code, validFrom: promo.validFrom });
    if (promo.validUntil && promo.validUntil < now) throw new ValidationError(`Le code promo "${promo.code}" a expiré`, { code: promo.code, validUntil: promo.validUntil });

    if (promo.maxRedemptions !== undefined && promo.redemptionCount >= promo.maxRedemptions) {
      throw new ValidationError(`Le code promo "${promo.code}" a atteint son nombre maximal d'utilisations`, { code: promo.code, maxRedemptions: promo.maxRedemptions, count: promo.redemptionCount });
    }

    if (promo.applicablePlanIds.length && context.planId && !promo.applicablePlanIds.includes(context.planId)) {
      throw new BadRequestError(`Le code promo "${promo.code}" n'est pas applicable à ce plan`, { code: promo.code, planId: context.planId });
    }
    if (promo.applicablePartnerIds.length && context.partnerId && !promo.applicablePartnerIds.includes(context.partnerId)) {
      throw new BadRequestError(`Le code promo "${promo.code}" n'est pas applicable à ce partenaire`, { code: promo.code, partnerId: context.partnerId });
    }

    if (promo.perUserLimit !== undefined) {
      const used = await this.store.promoCodes.countRedemptionsForUser(promo.id, context.userId);
      if (used >= promo.perUserLimit) {
        throw new ValidationError(`Le code promo "${promo.code}" a déjà été utilisé le nombre maximal de fois par cet utilisateur`, { code: promo.code, perUserLimit: promo.perUserLimit, used });
      }
    }

    return { promo };
  }

  /** Consomme le code : incrémente le compteur et enregistre la rédemption. Journalisé. */
  async redeem(ctx: AuditContext, input: { promoCodeId: string; userId: string; subscriptionId: string }): Promise<void> {
    await this.audit.wrap(
      ctx,
      { action: "promo_code.redeem", entityType: "promo_code", entityId: input.promoCodeId, metadata: { userId: input.userId, subscriptionId: input.subscriptionId } },
      async () => {
        const promo = await this.store.promoCodes.findById(input.promoCodeId);
        if (!promo) throw new NotFoundError("PromoCode", input.promoCodeId);
        await this.store.promoCodes.update(promo.id, { redemptionCount: promo.redemptionCount + 1 });
        await this.store.promoCodes.addRedemption({
          promoCodeId: promo.id,
          userId: input.userId,
          subscriptionId: input.subscriptionId,
          redeemedAt: new Date(),
        });
        return true;
      },
    );
  }
}
