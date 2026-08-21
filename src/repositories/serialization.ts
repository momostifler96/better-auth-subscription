/**
 * Utilitaires de sérialisation pour la persistence en base de données.
 * Convertit les dates en ISO strings et les objets en JSON avant insertion,
 * et reconvertit à la récupération.
 */

type DateFields = Partial<Record<string, true>>;

interface SerializationConfig {
  dateFields: DateFields;
  jsonFields: DateFields;
}

const configByModel: Record<string, SerializationConfig> = {
  advantage: {
    dateFields: { createdAt: true },
    jsonFields: {},
  },
  partner: {
    dateFields: { createdAt: true },
    jsonFields: {},
  },
  plan: {
    dateFields: { createdAt: true, updatedAt: true },
    jsonFields: { prices: true },
  },
  planAdvantage: {
    dateFields: {},
    jsonFields: {},
  },
  subscription: {
    dateFields: {
      currentPeriodStart: true,
      currentPeriodEnd: true,
      createdAt: true,
      updatedAt: true,
    },
    jsonFields: { advantageOverrides: true, metadata: true },
  },
  customSubscriptionRequest: {
    dateFields: { createdAt: true, updatedAt: true },
    jsonFields: { requestedAdvantages: true },
  },
  promoCode: {
    dateFields: { validFrom: true, validUntil: true, createdAt: true },
    jsonFields: { applicablePlanIds: true, applicablePartnerIds: true },
  },
  promoRedemption: {
    dateFields: { redeemedAt: true },
    jsonFields: {},
  },
  usageRecord: {
    dateFields: { periodStart: true, periodEnd: true, recordedAt: true },
    jsonFields: {},
  },
  overageAuthorization: {
    dateFields: { expiresAt: true, createdAt: true },
    jsonFields: {},
  },
  subscriptionAudit: {
    dateFields: { createdAt: true },
    jsonFields: { before: true, after: true, metadata: true },
  },
};

export function serialize<T extends Record<string, any>>(model: string, data: T): T {
  const config = configByModel[model];
  if (!config) return data;

  const result = { ...data };

  // Sérialiser les dates en ISO strings
  for (const field of Object.keys(config.dateFields)) {
    if (field in result && result[field] instanceof Date) {
      (result as any)[field] = (result[field] as Date).toISOString();
    }
  }

  // Sérialiser les objets/arrays en JSON strings
  for (const field of Object.keys(config.jsonFields)) {
    if (field in result && result[field] !== null && result[field] !== undefined) {
      const value = result[field];
      if (typeof value === 'object') {
        (result as any)[field] = JSON.stringify(value);
      }
    }
  }

  return result;
}

export function deserialize<T extends Record<string, any>>(model: string, data: T): T {
  const config = configByModel[model];
  if (!config) return data;

  const result = { ...data };

  // Désérialiser les strings en dates
  for (const field of Object.keys(config.dateFields)) {
    if (field in result && typeof result[field] === 'string') {
      (result as any)[field] = new Date(result[field]);
    }
  }

  // Désérialiser les JSON strings en objets/arrays
  for (const field of Object.keys(config.jsonFields)) {
    if (field in result && typeof result[field] === 'string') {
      try {
        (result as any)[field] = JSON.parse(result[field]);
      } catch {
        // Si parse échoue, laisser la valeur telle quelle
      }
    }
  }

  return result;
}

export function serializeMany<T extends Record<string, any>>(model: string, items: T[]): T[] {
  return items.map((item) => serialize(model, item));
}

export function deserializeMany<T extends Record<string, any>>(model: string, items: T[]): T[] {
  return items.map((item) => deserialize(model, item));
}
