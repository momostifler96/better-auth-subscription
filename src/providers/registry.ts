import type { ProviderKey } from "../types/domain.js";
import type { PaymentProvider } from "./types.js";

/**
 * Registre des providers de paiement actifs. Permet de :
 *  - supporter plusieurs providers en simultané (ex: Stripe pour l'Europe, Paddle pour le reste du monde),
 *  - ajouter un nouveau provider sans changer un seul service métier (Open/Closed principle),
 *  - retomber sur "manual" pour les plans partenaires gratuits ou les souscriptions hors-ligne.
 */
export class PaymentProviderRegistry {
  private providers = new Map<ProviderKey, PaymentProvider>();
  private defaultKey: ProviderKey | undefined;

  register(provider: PaymentProvider, opts?: { asDefault?: boolean }): this {
    this.providers.set(provider.key, provider);
    if (opts?.asDefault || !this.defaultKey) this.defaultKey = provider.key;
    return this;
  }

  get(key: ProviderKey): PaymentProvider {
    const provider = this.providers.get(key);
    if (!provider) {
      throw new Error(
        `Aucun provider de paiement enregistré pour la clé "${key}". Providers disponibles: ${[...this.providers.keys()].join(", ") || "aucun"}`,
      );
    }
    return provider;
  }

  getDefault(): PaymentProvider {
    if (!this.defaultKey) throw new Error("Aucun provider de paiement par défaut enregistré");
    return this.get(this.defaultKey);
  }

  has(key: ProviderKey): boolean {
    return this.providers.has(key);
  }

  list(): PaymentProvider[] {
    return [...this.providers.values()];
  }
}
