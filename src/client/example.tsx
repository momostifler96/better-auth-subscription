/**
 * Exemples d'utilisation du plugin client subscriptions.
 *
 * Ces exemples montrent comment utiliser les hooks React pour accéder
 * aux fonctionnalités du plugin depuis vos composants.
 */

import { createAuthClient } from "better-auth/client";
import { subscriptionsPlugin } from "better-subscriptions/client";
import {
  usePlans,
  useMySubscription,
  useSubscribe,
  useChangePlan,
  useCancelSubscription,
  useValidatePromoCode,
} from "better-subscriptions/client/react";

// ============================================================================
// Configuration du client
// ============================================================================

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000", // À adapter
  plugins: [subscriptionsPlugin()],
});

// ============================================================================
// Composant : Liste des plans
// ============================================================================

export function PlansPage() {
  const { data: plans, isLoading, error } = usePlans(authClient);

  if (isLoading) return <div>Chargement des plans...</div>;
  if (error) return <div>Erreur: {error.message}</div>;
  if (!plans) return <div>Aucun plan disponible</div>;

  return (
    <div className="plans-grid">
      <h1>Plans disponibles</h1>
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}

function PlanCard({ plan }: { plan: any }) {
  const { subscribe, isLoading, error } = useSubscribe(authClient);

  const handleSubscribe = async () => {
    try {
      await subscribe({
        planId: plan.id,
        provider: "stripe", // ou autre
      });
      alert("Abonnement réussi!");
    } catch (err) {
      alert(`Erreur: ${error?.message}`);
    }
  };

  return (
    <div className="plan-card">
      <h2>{plan.name}</h2>
      <p>{plan.description}</p>
      <p className="price">
        {/* Afficher le prix selon votre implémentation */}
      </p>
      <button onClick={handleSubscribe} disabled={isLoading}>
        {isLoading ? "Inscription en cours..." : "S'abonner"}
      </button>
    </div>
  );
}

// ============================================================================
// Composant : Abonnement actif
// ============================================================================

export function MySubscriptionPage() {
  const { data, isLoading, error, refetch } = useMySubscription(authClient);

  if (isLoading) return <div>Chargement de votre abonnement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  if (!data?.subscription) {
    return (
      <div>
        <h1>Pas d'abonnement actif</h1>
        <p>
          <a href="/plans">Choisir un plan</a>
        </p>
      </div>
    );
  }

  return (
    <SubscriptionDetail
      subscription={data.subscription}
      advantages={data.advantages}
      onUpdate={refetch}
    />
  );
}

function SubscriptionDetail({
  subscription,
  advantages,
  onUpdate,
}: {
  subscription: any;
  advantages: any[];
  onUpdate: () => void;
}) {
  const { changePlan, isLoading: isChangingPlan } = useChangePlan(authClient);
  const { cancel, isLoading: isCanceling } = useCancelSubscription(authClient);

  const handleChangePlan = async () => {
    const newPlanId = prompt("ID du nouveau plan:");
    if (!newPlanId) return;

    try {
      await changePlan(subscription.id, newPlanId);
      alert("Plan changé avec succès!");
      onUpdate();
    } catch (err) {
      alert("Erreur lors du changement de plan");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Êtes-vous sûr de vouloir annuler?")) return;

    try {
      await cancel(subscription.id, true); // atPeriodEnd = true
      alert("Abonnement annulé à la fin de la période!");
      onUpdate();
    } catch (err) {
      alert("Erreur lors de l'annulation");
    }
  };

  return (
    <div className="subscription-detail">
      <h1>Mon abonnement</h1>

      <section>
        <h2>Informations générales</h2>
        <p>
          <strong>Statut:</strong> {subscription.status}
        </p>
        <p>
          <strong>Période actuelle:</strong>{" "}
          {new Date(subscription.currentPeriodStart).toLocaleDateString()} -{" "}
          {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
        </p>
        <p>
          <strong>Fournisseur:</strong> {subscription.provider}
        </p>
      </section>

      <section>
        <h2>Avantages inclus</h2>
        <ul>
          {advantages.map((adv) => (
            <li key={adv.advantage.id}>
              <strong>{adv.advantage.name}</strong>
              {adv.value !== null && <span>: {adv.value}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="actions">
        <button
          onClick={handleChangePlan}
          disabled={isChangingPlan}
          className="btn-primary"
        >
          {isChangingPlan ? "Changement en cours..." : "Changer de plan"}
        </button>
        <button
          onClick={handleCancel}
          disabled={isCanceling}
          className="btn-danger"
        >
          {isCanceling ? "Annulation en cours..." : "Annuler"}
        </button>
      </section>
    </div>
  );
}

// ============================================================================
// Composant : Validation de code promo
// ============================================================================

export function PromoCodeValidator() {
  const { validate, isLoading, error, data } = useValidatePromoCode(authClient);
  const [code, setCode] = React.useState("");

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await validate(code);
    } catch (err) {
      // Erreur gérée dans le hook
    }
  };

  return (
    <form onSubmit={handleValidate}>
      <input
        type="text"
        placeholder="Code promo"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Vérification..." : "Vérifier"}
      </button>

      {error && <div className="error">{error.message}</div>}
      {data && (
        <div className="success">
          Code valide! Réduction: {data.value} {data.type}
        </div>
      )}
    </form>
  );
}

// ============================================================================
// Composant : Historique des abonnements
// ============================================================================

export function SubscriptionHistory() {
  // Note: Endpoint à implémenter côté serveur pour obtenir l'historique
  // Pour l'instant, on peut afficher l'abonnement actif
  const { data, isLoading } = useMySubscription(authClient);

  if (isLoading) return <div>Chargement...</div>;

  return (
    <div className="subscription-history">
      <h1>Historique des abonnements</h1>
      {data?.subscription ? (
        <div className="subscription-item">
          <p>
            <strong>Plan:</strong> {data.subscription.planId}
          </p>
          <p>
            <strong>Statut:</strong> {data.subscription.status}
          </p>
          <p>
            <strong>Depuis:</strong>{" "}
            {new Date(data.subscription.createdAt).toLocaleDateString()}
          </p>
        </div>
      ) : (
        <p>Aucun historique d'abonnement</p>
      )}
    </div>
  );
}

// ============================================================================
// Composant : Gestion des avantages (exemple avancé)
// ============================================================================

export function AdvantagesUsage() {
  const { data, isLoading } = useMySubscription(authClient);

  if (isLoading) return <div>Chargement...</div>;
  if (!data?.subscription) return <div>Pas d'abonnement actif</div>;

  return (
    <div className="advantages-usage">
      <h1>Utilisation de vos avantages</h1>
      {data.advantages.map((advantage) => (
        <AdvantageItem
          key={advantage.advantage.id}
          advantage={advantage}
          subscriptionId={data.subscription!.id}
        />
      ))}
    </div>
  );
}

function AdvantageItem({
  advantage,
  subscriptionId,
}: {
  advantage: any;
  subscriptionId: string;
}) {
  const { record, isLoading } = useRecordUsage(authClient);
  const [quantity, setQuantity] = React.useState(1);

  const handleRecord = async () => {
    try {
      await record(subscriptionId, advantage.advantage.key, quantity);
      alert("Utilisation enregistrée!");
      setQuantity(1);
    } catch (err) {
      alert("Erreur lors de l'enregistrement");
    }
  };

  return (
    <div className="advantage-item">
      <h3>{advantage.advantage.name}</h3>
      <p>{advantage.advantage.description}</p>

      {advantage.advantage.valueType === "quantity" && (
        <div className="quantity-input">
          <label>
            Quantité:
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              disabled={isLoading}
            />
          </label>
          <button onClick={handleRecord} disabled={isLoading}>
            {isLoading ? "Enregistrement..." : "Enregistrer l'utilisation"}
          </button>
        </div>
      )}
    </div>
  );
}
