import { useCallback, useEffect, useState } from "react";
import { Button, Card, Field, Result, type LogState } from "./ui";
import { errorMessage, get, patch, post, pretty } from "../api";

type Plan = {
  id: string;
  slug: string;
  name: string;
};

type CustomRequest = {
  id: string;
  status: string;
  requestedAdvantages: Array<{ advantageKey: string; value: boolean | number | null }>;
  justification?: string | null;
  proposedPriceCents?: number | null;
};

type AuditLog = {
  id: string;
  action: string;
  actorId: string;
  actorType: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

const DEFAULT_ADVANTAGES = `[
  {"advantageKey":"api_calls_per_month","value":1000,"overageAllowed":true,"overageUnitPriceCents":2},
  {"advantageKey":"export_pdf","value":true}
]`;

export function AdminPanel({
  onPlansChanged,
  activeSubscriptionId,
}: {
  onPlansChanged: () => Promise<void> | void;
  activeSubscriptionId: string | null;
}) {
  const [advantageLog, setAdvantageLog] = useState<LogState>(null);
  const [planLog, setPlanLog] = useState<LogState>(null);
  const [updatePlanLog, setUpdatePlanLog] = useState<LogState>(null);
  const [promoLog, setPromoLog] = useState<LogState>(null);
  const [partnerLog, setPartnerLog] = useState<LogState>(null);
  const [partnerPlanLog, setPartnerPlanLog] = useState<LogState>(null);
  const [pendingLog, setPendingLog] = useState<LogState>(null);
  const [overageLog, setOverageLog] = useState<LogState>(null);
  const [auditLog, setAuditLog] = useState<LogState>(null);

  const [advantageKey, setAdvantageKey] = useState("seats");
  const [advantageName, setAdvantageName] = useState("Sièges");
  const [advantageValueType, setAdvantageValueType] = useState("quantity");
  const [advantageUnit, setAdvantageUnit] = useState("sièges");
  const [advantages, setAdvantages] = useState<Array<{ key: string; name: string }>>([]);

  const [planSlug, setPlanSlug] = useState("team");
  const [planName, setPlanName] = useState("Team");
  const [planKind, setPlanKind] = useState("standard");
  const [planPublic, setPlanPublic] = useState(true);
  const [planAmount, setPlanAmount] = useState("4900");
  const [planInterval, setPlanInterval] = useState("month");
  const [planAdvantages, setPlanAdvantages] = useState(DEFAULT_ADVANTAGES);

  const [updateSlug, setUpdateSlug] = useState("team");
  const [updateName, setUpdateName] = useState("Team Pro");
  const [updatePublic, setUpdatePublic] = useState(true);

  const [promoCode, setPromoCode] = useState("E2E20");
  const [promoType, setPromoType] = useState("percent");
  const [promoValue, setPromoValue] = useState("20");
  const [promoMax, setPromoMax] = useState("10");

  const [partnerName, setPartnerName] = useState("Partenaire ACME");
  const [partnerSlug, setPartnerSlug] = useState("acme-e2e");
  const [partnerBillingMode, setPartnerBillingMode] = useState("free");
  const [partnerDiscount, setPartnerDiscount] = useState("0");
  const [partnerId, setPartnerId] = useState("");

  const [partnerPlanSlug, setPartnerPlanSlug] = useState("acme-e2e-free");
  const [partnerPlanName, setPartnerPlanName] = useState("Offre ACME");
  const [partnerPlanAdvantages, setPartnerPlanAdvantages] = useState(DEFAULT_ADVANTAGES);

  const [pending, setPending] = useState<CustomRequest[]>([]);

  const [overageSubscriptionId, setOverageSubscriptionId] = useState(
    activeSubscriptionId ?? "",
  );
  const [overageKey, setOverageKey] = useState("api_calls_per_month");
  const [overageExtra, setOverageExtra] = useState("500");
  const [overageReason, setOverageReason] = useState(
    "Pic de trafic validé par le support",
  );

  const [audit, setAudit] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (activeSubscriptionId) setOverageSubscriptionId(activeSubscriptionId);
  }, [activeSubscriptionId]);

  const loadAdvantages = useCallback(async () => {
    const result = await get<{ advantages: Array<{ key: string; name: string }> }>(
      "/subscriptions/advantages",
    );
    if (result.ok) setAdvantages(result.data?.advantages ?? []);
  }, []);

  const loadPending = useCallback(async () => {
    const result = await get<{ requests: CustomRequest[] }>(
      "/subscriptions/custom-requests/pending",
    );
    if (!result.ok) {
      setPendingLog({ ok: false, text: errorMessage(result) });
      return;
    }
    setPending(result.data?.requests ?? []);
    setPendingLog({ ok: true, text: pretty(result.data) });
  }, []);

  const loadAudit = useCallback(async () => {
    const result = await get<{ logs: AuditLog[] }>("/subscriptions/audit-logs");
    if (!result.ok) {
      setAuditLog({ ok: false, text: errorMessage(result) });
      return;
    }
    setAudit(result.data?.logs ?? []);
    setAuditLog({ ok: true, text: `${result.data?.logs.length ?? 0} entrée(s)` });
  }, []);

  useEffect(() => {
    void loadAdvantages();
    void loadPending();
    void loadAudit();
  }, [loadAdvantages, loadPending, loadAudit]);

  async function createAdvantage() {
    const result = await post("/subscriptions/advantages", {
      key: advantageKey,
      name: advantageName,
      valueType: advantageValueType,
      unit: advantageUnit || undefined,
    });
    setAdvantageLog(
      result.ok
        ? { ok: true, text: pretty(result.data) }
        : { ok: false, text: errorMessage(result) },
    );
    if (result.ok) await loadAdvantages();
  }

  async function createPlan() {
    let parsedAdvantages: unknown;
    try {
      parsedAdvantages = JSON.parse(planAdvantages);
    } catch (error) {
      setPlanLog({
        ok: false,
        text: `JSON d'avantages invalide: ${(error as Error).message}`,
      });
      return;
    }
    const result = await post("/subscriptions/plans", {
      slug: planSlug,
      name: planName,
      kind: planKind,
      isPublic: planPublic,
      prices: [
        {
          provider: "manual",
          externalPriceId: "manual",
          currency: "EUR",
          amountCents: Number(planAmount),
          interval: planInterval,
        },
      ],
      advantages: parsedAdvantages,
    });
    setPlanLog(
      result.ok
        ? { ok: true, text: pretty(result.data) }
        : { ok: false, text: errorMessage(result) },
    );
    if (result.ok) await onPlansChanged();
  }

  async function updatePlan() {
    const result = await patch(`/subscriptions/plans/${updateSlug}`, {
      name: updateName,
      isPublic: updatePublic,
    });
    setUpdatePlanLog(
      result.ok
        ? { ok: true, text: pretty(result.data) }
        : { ok: false, text: errorMessage(result) },
    );
    if (result.ok) await onPlansChanged();
  }

  async function createPromo() {
    const result = await post("/subscriptions/promo-codes", {
      code: promoCode,
      type: promoType,
      value: Number(promoValue),
      maxRedemptions: promoMax ? Number(promoMax) : undefined,
    });
    setPromoLog(
      result.ok
        ? { ok: true, text: pretty(result.data) }
        : { ok: false, text: errorMessage(result) },
    );
  }

  async function createPartner() {
    const result = await post<{ partner?: { id: string } }>("/subscriptions/partners", {
      slug: partnerSlug,
      name: partnerName,
      billingMode: partnerBillingMode,
      discountPercent: Number(partnerDiscount),
    });
    setPartnerLog(
      result.ok
        ? { ok: true, text: pretty(result.data) }
        : { ok: false, text: errorMessage(result) },
    );
    if (result.ok && result.data?.partner?.id) {
      setPartnerId(result.data.partner.id);
    }
  }

  async function createPartnerPlan() {
    if (!partnerId) {
      setPartnerPlanLog({ ok: false, text: "Créez d'abord un partenaire." });
      return;
    }
    let parsedAdvantages: unknown;
    try {
      parsedAdvantages = JSON.parse(partnerPlanAdvantages);
    } catch (error) {
      setPartnerPlanLog({
        ok: false,
        text: `JSON d'avantages invalide: ${(error as Error).message}`,
      });
      return;
    }
    const result = await post(`/subscriptions/partners/${partnerId}/plans`, {
      slug: partnerPlanSlug,
      name: partnerPlanName,
      advantages: parsedAdvantages,
    });
    setPartnerPlanLog(
      result.ok
        ? { ok: true, text: pretty(result.data) }
        : { ok: false, text: errorMessage(result) },
    );
    if (result.ok) await onPlansChanged();
  }

  async function approve(requestId: string) {
    const result = await post(`/subscriptions/custom-requests/${requestId}/approve`, {
      reviewNotes: "Approuvé depuis le panneau admin E2E",
    });
    setPendingLog(
      result.ok
        ? { ok: true, text: pretty(result.data) }
        : { ok: false, text: errorMessage(result) },
    );
    if (result.ok) await loadPending();
  }

  async function reject(requestId: string) {
    const result = await post(`/subscriptions/custom-requests/${requestId}/reject`, {
      reviewNotes: "Refusé depuis le panneau admin E2E",
    });
    setPendingLog(
      result.ok
        ? { ok: true, text: pretty(result.data) }
        : { ok: false, text: errorMessage(result) },
    );
    if (result.ok) await loadPending();
  }

  async function authorizeOverage() {
    const result = await post("/subscriptions/overage/authorize", {
      subscriptionId: overageSubscriptionId,
      advantageKey: overageKey,
      authorizedExtraLimit: overageExtra ? Number(overageExtra) : null,
      reason: overageReason,
    });
    setOverageLog(
      result.ok
        ? { ok: true, text: pretty(result.data) }
        : { ok: false, text: errorMessage(result) },
    );
  }

  return (
    <Card
      title="Panneau administrateur"
      description="Tous ces endpoints renvoient 403 si la session n'a pas le rôle admin"
      testId="admin-panel"
    >
      <div className="grid two">
        <form
          className="subcard"
          onSubmit={(event) => {
            event.preventDefault();
            void createAdvantage();
          }}
        >
          <h3>Créer un avantage</h3>
          <Field label="Clé" htmlFor="adv-key">
            <input
              id="adv-key"
              data-testid="adv-key"
              value={advantageKey}
              onChange={(event) => setAdvantageKey(event.target.value)}
            />
          </Field>
          <Field label="Nom" htmlFor="adv-name">
            <input
              id="adv-name"
              data-testid="adv-name"
              value={advantageName}
              onChange={(event) => setAdvantageName(event.target.value)}
            />
          </Field>
          <Field label="Type" htmlFor="adv-value-type">
            <select
              id="adv-value-type"
              data-testid="adv-value-type"
              value={advantageValueType}
              onChange={(event) => setAdvantageValueType(event.target.value)}
            >
              <option value="quantity">quantity</option>
              <option value="boolean">boolean</option>
            </select>
          </Field>
          <Field label="Unité" htmlFor="adv-unit">
            <input
              id="adv-unit"
              data-testid="adv-unit"
              value={advantageUnit}
              onChange={(event) => setAdvantageUnit(event.target.value)}
            />
          </Field>
          <Button testId="create-advantage-submit" type="submit">
            Créer l'avantage
          </Button>
          <Result testId="advantage-result" log={advantageLog} />
          <p className="muted small" data-testid="advantages-list">
            {advantages.map((advantage) => advantage.key).join(", ") || "—"}
          </p>
        </form>

        <form
          className="subcard"
          onSubmit={(event) => {
            event.preventDefault();
            void createPlan();
          }}
        >
          <h3>Créer un plan</h3>
          <Field label="Slug" htmlFor="plan-slug">
            <input
              id="plan-slug"
              data-testid="plan-slug"
              value={planSlug}
              onChange={(event) => setPlanSlug(event.target.value)}
            />
          </Field>
          <Field label="Nom" htmlFor="plan-name">
            <input
              id="plan-name"
              data-testid="plan-name"
              value={planName}
              onChange={(event) => setPlanName(event.target.value)}
            />
          </Field>
          <Field label="Type" htmlFor="plan-kind">
            <select
              id="plan-kind"
              data-testid="plan-kind"
              value={planKind}
              onChange={(event) => setPlanKind(event.target.value)}
            >
              <option value="standard">standard</option>
              <option value="custom">custom</option>
              <option value="partner">partner</option>
            </select>
          </Field>
          <label className="checkbox">
            <input
              data-testid="plan-public"
              type="checkbox"
              checked={planPublic}
              onChange={(event) => setPlanPublic(event.target.checked)}
            />
            Plan public
          </label>
          <Field label="Montant (centimes)" htmlFor="plan-amount">
            <input
              id="plan-amount"
              data-testid="plan-amount"
              type="number"
              value={planAmount}
              onChange={(event) => setPlanAmount(event.target.value)}
            />
          </Field>
          <Field label="Intervalle" htmlFor="plan-interval">
            <select
              id="plan-interval"
              data-testid="plan-interval"
              value={planInterval}
              onChange={(event) => setPlanInterval(event.target.value)}
            >
              <option value="month">month</option>
              <option value="year">year</option>
              <option value="one_time">one_time</option>
            </select>
          </Field>
          <Field label="Avantages (JSON)" htmlFor="plan-advantages">
            <textarea
              id="plan-advantages"
              data-testid="plan-advantages"
              rows={6}
              value={planAdvantages}
              onChange={(event) => setPlanAdvantages(event.target.value)}
            />
          </Field>
          <Button testId="create-plan-submit" type="submit">
            Créer le plan
          </Button>
          <Result testId="plan-result" log={planLog} />
        </form>

        <form
          className="subcard"
          onSubmit={(event) => {
            event.preventDefault();
            void updatePlan();
          }}
        >
          <h3>Modifier un plan</h3>
          <Field label="Slug" htmlFor="update-plan-slug">
            <input
              id="update-plan-slug"
              data-testid="update-plan-slug"
              value={updateSlug}
              onChange={(event) => setUpdateSlug(event.target.value)}
            />
          </Field>
          <Field label="Nouveau nom" htmlFor="update-plan-name">
            <input
              id="update-plan-name"
              data-testid="update-plan-name"
              value={updateName}
              onChange={(event) => setUpdateName(event.target.value)}
            />
          </Field>
          <label className="checkbox">
            <input
              data-testid="update-plan-public"
              type="checkbox"
              checked={updatePublic}
              onChange={(event) => setUpdatePublic(event.target.checked)}
            />
            Public
          </label>
          <Button testId="update-plan-submit" type="submit">
            Mettre à jour
          </Button>
          <Result testId="update-plan-result" log={updatePlanLog} />
        </form>

        <form
          className="subcard"
          onSubmit={(event) => {
            event.preventDefault();
            void createPromo();
          }}
        >
          <h3>Créer un code promo</h3>
          <Field label="Code" htmlFor="promo-code">
            <input
              id="promo-code"
              data-testid="promo-code"
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
            />
          </Field>
          <Field label="Type" htmlFor="promo-type">
            <select
              id="promo-type"
              data-testid="promo-type"
              value={promoType}
              onChange={(event) => setPromoType(event.target.value)}
            >
              <option value="percent">percent</option>
              <option value="fixed">fixed</option>
              <option value="free_period">free_period</option>
              <option value="trial_extension">trial_extension</option>
            </select>
          </Field>
          <Field label="Valeur" htmlFor="promo-value">
            <input
              id="promo-value"
              data-testid="promo-value"
              type="number"
              value={promoValue}
              onChange={(event) => setPromoValue(event.target.value)}
            />
          </Field>
          <Field label="Utilisations max" htmlFor="promo-max">
            <input
              id="promo-max"
              data-testid="promo-max"
              type="number"
              value={promoMax}
              onChange={(event) => setPromoMax(event.target.value)}
            />
          </Field>
          <Button testId="create-promo-submit" type="submit">
            Créer le code
          </Button>
          <Result testId="promo-result" log={promoLog} />
        </form>

        <form
          className="subcard"
          onSubmit={(event) => {
            event.preventDefault();
            void createPartner();
          }}
        >
          <h3>Créer un partenaire</h3>
          <Field label="Nom" htmlFor="partner-name">
            <input
              id="partner-name"
              data-testid="partner-name"
              value={partnerName}
              onChange={(event) => setPartnerName(event.target.value)}
            />
          </Field>
          <Field label="Slug" htmlFor="partner-slug">
            <input
              id="partner-slug"
              data-testid="partner-slug"
              value={partnerSlug}
              onChange={(event) => setPartnerSlug(event.target.value)}
            />
          </Field>
          <Field label="Mode" htmlFor="partner-billing-mode">
            <select
              id="partner-billing-mode"
              data-testid="partner-billing-mode"
              value={partnerBillingMode}
              onChange={(event) => setPartnerBillingMode(event.target.value)}
            >
              <option value="free">free</option>
              <option value="paid">paid</option>
            </select>
          </Field>
          <Field label="Remise (%)" htmlFor="partner-discount">
            <input
              id="partner-discount"
              data-testid="partner-discount"
              type="number"
              value={partnerDiscount}
              onChange={(event) => setPartnerDiscount(event.target.value)}
            />
          </Field>
          <Button testId="create-partner-submit" type="submit">
            Créer le partenaire
          </Button>
          <Result testId="partner-result" log={partnerLog} />
        </form>

        <form
          className="subcard"
          onSubmit={(event) => {
            event.preventDefault();
            void createPartnerPlan();
          }}
        >
          <h3>Créer un plan partenaire</h3>
          <Field label="ID partenaire" htmlFor="partner-plan-partner-id">
            <input
              id="partner-plan-partner-id"
              data-testid="partner-plan-partner-id"
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
            />
          </Field>
          <Field label="Slug" htmlFor="partner-plan-slug">
            <input
              id="partner-plan-slug"
              data-testid="partner-plan-slug"
              value={partnerPlanSlug}
              onChange={(event) => setPartnerPlanSlug(event.target.value)}
            />
          </Field>
          <Field label="Nom" htmlFor="partner-plan-name">
            <input
              id="partner-plan-name"
              data-testid="partner-plan-name"
              value={partnerPlanName}
              onChange={(event) => setPartnerPlanName(event.target.value)}
            />
          </Field>
          <Field label="Avantages (JSON)" htmlFor="partner-plan-advantages">
            <textarea
              id="partner-plan-advantages"
              data-testid="partner-plan-advantages"
              rows={5}
              value={partnerPlanAdvantages}
              onChange={(event) => setPartnerPlanAdvantages(event.target.value)}
            />
          </Field>
          <Button testId="create-partner-plan-submit" type="submit">
            Créer le plan partenaire
          </Button>
          <Result testId="partner-plan-result" log={partnerPlanLog} />
        </form>
      </div>

      <div className="subcard">
        <div className="row">
          <h3>Demandes personnalisées en attente</h3>
          <Button testId="refresh-pending" onClick={() => void loadPending()}>
            Rafraîchir
          </Button>
        </div>
        {pending.length === 0 ? (
          <p className="muted" data-testid="pending-empty">
            Aucune demande en attente.
          </p>
        ) : (
          <ul className="list" data-testid="pending-list">
            {pending.map((request) => (
              <li key={request.id} data-testid={`pending-request-${request.id}`}>
                <div>
                  <code>{request.id}</code>
                  <p className="muted small">
                    {request.requestedAdvantages
                      .map((advantage) => `${advantage.advantageKey}=${String(advantage.value)}`)
                      .join(", ")}
                  </p>
                </div>
                <div className="row">
                  <Button
                    testId={`approve-${request.id}`}
                    onClick={() => void approve(request.id)}
                  >
                    Approuver
                  </Button>
                  <Button
                    testId={`reject-${request.id}`}
                    onClick={() => void reject(request.id)}
                  >
                    Rejeter
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Result testId="pending-result" log={pendingLog} />
      </div>

      <form
        className="subcard"
        onSubmit={(event) => {
          event.preventDefault();
          void authorizeOverage();
        }}
      >
        <h3>Autoriser un dépassement</h3>
        <Field label="ID souscription" htmlFor="overage-subscription-id">
          <input
            id="overage-subscription-id"
            data-testid="overage-subscription-id"
            value={overageSubscriptionId}
            onChange={(event) => setOverageSubscriptionId(event.target.value)}
          />
        </Field>
        <Field label="Avantage" htmlFor="overage-advantage-key">
          <input
            id="overage-advantage-key"
            data-testid="overage-advantage-key"
            value={overageKey}
            onChange={(event) => setOverageKey(event.target.value)}
          />
        </Field>
        <Field label="Limite additionnelle" htmlFor="overage-extra-limit">
          <input
            id="overage-extra-limit"
            data-testid="overage-extra-limit"
            type="number"
            value={overageExtra}
            onChange={(event) => setOverageExtra(event.target.value)}
          />
        </Field>
        <Field label="Motif" htmlFor="overage-reason">
          <input
            id="overage-reason"
            data-testid="overage-reason"
            value={overageReason}
            onChange={(event) => setOverageReason(event.target.value)}
          />
        </Field>
        <Button testId="authorize-overage-submit" type="submit">
          Autoriser
        </Button>
        <Result testId="overage-result" log={overageLog} />
      </form>

      <div className="subcard">
        <div className="row">
          <h3>Journal d'audit</h3>
          <Button testId="refresh-audit" onClick={() => void loadAudit()}>
            Rafraîchir
          </Button>
          <span className="muted" data-testid="audit-count">
            {audit.length} entrée(s)
          </span>
        </div>
        {audit.length === 0 ? (
          <p className="muted" data-testid="audit-empty">
            Journal vide.
          </p>
        ) : (
          <ul className="audit" data-testid="audit-list">
            {audit.map((entry) => (
              <li key={entry.id} data-testid={`audit-row-${entry.action}`}>
                <code>{entry.action}</code>
                <span className="muted">
                  {entry.actorType}:{entry.actorId} → {entry.entityType}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Result testId="audit-result" log={auditLog} />
      </div>
    </Card>
  );
}
