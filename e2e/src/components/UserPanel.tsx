import { useCallback, useEffect, useState } from "react";
import { Button, Card, Field, Result, type LogState } from "./ui";
import { errorMessage, get, post, pretty } from "../api";

type Plan = {
  id: string;
  slug: string;
  name: string;
};

type MySubscriptionResponse = {
  subscription: {
    id: string;
    planId: string;
    status: string;
    provider?: string;
    appliedPromoCodeId?: string | null;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  } | null;
  advantages: Array<{
    value: boolean | number | null;
    overageAllowed?: boolean;
    advantage?: { key: string; name: string };
  }>;
};

type Session = { user?: { id?: string; email?: string } } | null;

export function UserPanel({
  session,
  plans,
  onSubscriptionChange,
}: {
  session: Session;
  plans: Plan[];
  onSubscriptionChange: (subscriptionId: string | null) => void;
}) {
  const [mine, setMine] = useState<MySubscriptionResponse | null>(null);
  const [refreshLog, setRefreshLog] = useState<LogState>(null);
  const [subscribeLog, setSubscribeLog] = useState<LogState>(null);
  const [changeLog, setChangeLog] = useState<LogState>(null);
  const [cancelLog, setCancelLog] = useState<LogState>(null);
  const [promoLog, setPromoLog] = useState<LogState>(null);
  const [usageLog, setUsageLog] = useState<LogState>(null);
  const [customLog, setCustomLog] = useState<LogState>(null);

  const [planId, setPlanId] = useState("");
  const [provider, setProvider] = useState("manual");
  const [promoCode, setPromoCode] = useState("");
  const [proofUrl, setProofUrl] = useState("https://example.test/proof.png");
  const [quantity, setQuantity] = useState("1");

  const [newPlanId, setNewPlanId] = useState("");
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);

  const [validateCode, setValidateCode] = useState("LAUNCH20");
  const [usageKey, setUsageKey] = useState("api_calls_per_month");
  const [usageQty, setUsageQty] = useState("100");

  const [customKey, setCustomKey] = useState("api_calls_per_month");
  const [customValue, setCustomValue] = useState("50000");
  const [customPrice, setCustomPrice] = useState("49900");
  const [customJustification, setCustomJustification] = useState(
    "Volume négocié par l'équipe commerciale",
  );

  const subscription = mine?.subscription ?? null;

  const refreshMine = useCallback(async () => {
    if (!session?.user) return;
    const result = await get<MySubscriptionResponse>("/subscriptions/me");
    if (!result.ok) {
      setRefreshLog({ ok: false, text: errorMessage(result) });
      return;
    }
    setMine(result.data);
    setRefreshLog({ ok: true, text: pretty(result.data) });
    onSubscriptionChange(result.data?.subscription?.id ?? null);
  }, [session?.user, onSubscriptionChange]);

  useEffect(() => {
    void refreshMine();
  }, [refreshMine]);

  useEffect(() => {
    if (!planId && plans[0]) setPlanId(plans[0].id);
    if (!newPlanId && plans[0]) setNewPlanId(plans[0].id);
  }, [plans, planId, newPlanId]);

  async function subscribe() {
    const result = await post("/subscriptions/subscribe", {
      planId,
      provider: provider === "auto" ? undefined : provider,
      promoCode: promoCode || undefined,
      manualProofUrl: proofUrl || undefined,
      quantity: quantity ? Number(quantity) : undefined,
    });
    if (!result.ok) {
      setSubscribeLog({ ok: false, text: errorMessage(result) });
      return;
    }
    setSubscribeLog({ ok: true, text: pretty(result.data) });
    await refreshMine();
  }

  async function changePlan() {
    if (!subscription) return;
    const result = await post("/subscriptions/change-plan", {
      subscriptionId: subscription.id,
      newPlanId,
    });
    if (!result.ok) {
      setChangeLog({ ok: false, text: errorMessage(result) });
      return;
    }
    setChangeLog({ ok: true, text: pretty(result.data) });
    await refreshMine();
  }

  async function cancelSubscription() {
    if (!subscription) return;
    const result = await post("/subscriptions/cancel", {
      subscriptionId: subscription.id,
      atPeriodEnd: cancelAtPeriodEnd,
    });
    if (!result.ok) {
      setCancelLog({ ok: false, text: errorMessage(result) });
      return;
    }
    setCancelLog({ ok: true, text: pretty(result.data) });
    await refreshMine();
  }

  async function validatePromo() {
    const result = await post("/subscriptions/promo-codes/validate", {
      code: validateCode,
      planId: planId || undefined,
    });
    setPromoLog(
      result.ok
        ? { ok: true, text: pretty(result.data) }
        : { ok: false, text: errorMessage(result) },
    );
  }

  async function recordUsage() {
    if (!subscription) return;
    const result = await post("/subscriptions/usage/record", {
      subscriptionId: subscription.id,
      advantageKey: usageKey,
      quantity: Number(usageQty),
    });
    setUsageLog(
      result.ok
        ? { ok: true, text: pretty(result.data) }
        : { ok: false, text: errorMessage(result) },
    );
  }

  async function requestCustom() {
    const result = await post("/subscriptions/custom-requests", {
      requestedAdvantages: [
        { advantageKey: customKey, value: Number(customValue) },
      ],
      proposedPriceCents: Number(customPrice),
      proposedCurrency: "EUR",
      proposedInterval: "month",
      justification: customJustification,
    });
    setCustomLog(
      result.ok
        ? { ok: true, text: pretty(result.data) }
        : { ok: false, text: errorMessage(result) },
    );
  }

  return (
    <Card
      title="Espace utilisateur"
      description="Souscription, changement de plan, annulation, promo, usage et demande personnalisée"
      testId="user-panel"
    >
      <div className="row">
        <Button testId="refresh-my-sub" onClick={() => void refreshMine()}>
          Recharger mon abonnement
        </Button>
        <span className="muted" data-testid="user-email">
          {session?.user?.email}
        </span>
      </div>

      <div className="subcard" data-testid="my-sub">
        {subscription ? (
          <dl className="details">
            <dt>Statut</dt>
            <dd data-testid="my-sub-status">{subscription.status}</dd>
            <dt>ID</dt>
            <dd className="mono" data-testid="my-sub-id">
              {subscription.id}
            </dd>
            <dt>Plan</dt>
            <dd className="mono" data-testid="my-sub-plan">
              {subscription.planId}
            </dd>
            <dt>Provider</dt>
            <dd data-testid="my-sub-provider">{subscription.provider}</dd>
            <dt>Promo</dt>
            <dd className="mono" data-testid="my-sub-promo">
              {subscription.appliedPromoCodeId ?? "—"}
            </dd>
            <dt>Fin de période</dt>
            <dd data-testid="my-sub-period-end">
              {subscription.currentPeriodEnd ?? "—"}
            </dd>
            <dt>Avantages</dt>
            <dd>
              <ul data-testid="my-sub-advantages">
                {mine?.advantages.map((advantage, index) => (
                  <li key={`${advantage.advantage?.key ?? index}`}>
                    <code>{advantage.advantage?.key ?? "?"}</code> ={" "}
                    <strong>{String(advantage.value)}</strong>
                  </li>
                ))}
              </ul>
            </dd>
          </dl>
        ) : (
          <p className="muted" data-testid="my-sub-empty">
            Aucune souscription active.
          </p>
        )}
      </div>
      <Result testId="my-sub-result" log={refreshLog} />

      <div className="grid two">
        <form
          className="subcard"
          onSubmit={(event) => {
            event.preventDefault();
            void subscribe();
          }}
        >
          <h3>Souscrire</h3>
          <Field label="Plan" htmlFor="subscribe-plan">
            <select
              id="subscribe-plan"
              data-testid="subscribe-plan"
              value={planId}
              onChange={(event) => setPlanId(event.target.value)}
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({plan.slug})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Provider" htmlFor="subscribe-provider">
            <select
              id="subscribe-provider"
              data-testid="subscribe-provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
            >
              <option value="manual">manual</option>
              <option value="auto">auto (provider du plan)</option>
            </select>
          </Field>
          <Field label="Code promo" htmlFor="subscribe-promo">
            <input
              id="subscribe-promo"
              data-testid="subscribe-promo"
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
            />
          </Field>
          <Field
            label="Preuve de paiement (URL)"
            htmlFor="subscribe-proof"
            hint="Requise pour le provider manual, sauf plan partenaire gratuit"
          >
            <input
              id="subscribe-proof"
              data-testid="subscribe-proof"
              value={proofUrl}
              onChange={(event) => setProofUrl(event.target.value)}
            />
          </Field>
          <Field label="Quantité" htmlFor="subscribe-quantity">
            <input
              id="subscribe-quantity"
              data-testid="subscribe-quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </Field>
          <Button testId="subscribe-submit" type="submit">
            Souscrire
          </Button>
          <Result testId="subscribe-result" log={subscribeLog} />
        </form>

        <form
          className="subcard"
          onSubmit={(event) => {
            event.preventDefault();
            void changePlan();
          }}
        >
          <h3>Changer de plan</h3>
          <Field label="Nouveau plan" htmlFor="change-plan-select">
            <select
              id="change-plan-select"
              data-testid="change-plan-select"
              value={newPlanId}
              onChange={(event) => setNewPlanId(event.target.value)}
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({plan.slug})
                </option>
              ))}
            </select>
          </Field>
          <Button
            testId="change-plan-submit"
            type="submit"
            disabled={!subscription}
          >
            Changer de plan
          </Button>
          <Result testId="change-plan-result" log={changeLog} />

          <h3>Annuler</h3>
          <label className="checkbox">
            <input
              data-testid="cancel-at-period-end"
              type="checkbox"
              checked={cancelAtPeriodEnd}
              onChange={(event) => setCancelAtPeriodEnd(event.target.checked)}
            />
            Annuler à la fin de la période
          </label>
          <Button
            testId="cancel-submit"
            type="button"
            disabled={!subscription}
            onClick={() => void cancelSubscription()}
          >
            Annuler l'abonnement
          </Button>
          <Result testId="cancel-result" log={cancelLog} />
        </form>

        <form
          className="subcard"
          onSubmit={(event) => {
            event.preventDefault();
            void validatePromo();
          }}
        >
          <h3>Valider un code promo</h3>
          <Field label="Code" htmlFor="validate-promo-code">
            <input
              id="validate-promo-code"
              data-testid="validate-promo-code"
              value={validateCode}
              onChange={(event) => setValidateCode(event.target.value)}
            />
          </Field>
          <Button testId="validate-promo-submit" type="submit">
            Valider
          </Button>
          <Result testId="validate-promo-result" log={promoLog} />
        </form>

        <form
          className="subcard"
          onSubmit={(event) => {
            event.preventDefault();
            void recordUsage();
          }}
        >
          <h3>Enregistrer une consommation</h3>
          <Field label="Avantage" htmlFor="usage-key">
            <input
              id="usage-key"
              data-testid="usage-key"
              value={usageKey}
              onChange={(event) => setUsageKey(event.target.value)}
            />
          </Field>
          <Field label="Quantité" htmlFor="usage-qty">
            <input
              id="usage-qty"
              data-testid="usage-qty"
              type="number"
              min="0"
              value={usageQty}
              onChange={(event) => setUsageQty(event.target.value)}
            />
          </Field>
          <Button
            testId="record-usage-submit"
            type="submit"
            disabled={!subscription}
          >
            Enregistrer
          </Button>
          <Result testId="usage-result" log={usageLog} />
        </form>

        <form
          className="subcard"
          onSubmit={(event) => {
            event.preventDefault();
            void requestCustom();
          }}
        >
          <h3>Demande de souscription personnalisée</h3>
          <Field label="Avantage souhaité" htmlFor="custom-key">
            <input
              id="custom-key"
              data-testid="custom-key"
              value={customKey}
              onChange={(event) => setCustomKey(event.target.value)}
            />
          </Field>
          <Field label="Valeur" htmlFor="custom-value">
            <input
              id="custom-value"
              data-testid="custom-value"
              type="number"
              value={customValue}
              onChange={(event) => setCustomValue(event.target.value)}
            />
          </Field>
          <Field label="Prix proposé (centimes)" htmlFor="custom-price">
            <input
              id="custom-price"
              data-testid="custom-price"
              type="number"
              value={customPrice}
              onChange={(event) => setCustomPrice(event.target.value)}
            />
          </Field>
          <Field label="Justification" htmlFor="custom-justification">
            <input
              id="custom-justification"
              data-testid="custom-justification"
              value={customJustification}
              onChange={(event) => setCustomJustification(event.target.value)}
            />
          </Field>
          <Button testId="request-custom-submit" type="submit">
            Envoyer la demande
          </Button>
          <Result testId="custom-result" log={customLog} />
        </form>
      </div>
    </Card>
  );
}
