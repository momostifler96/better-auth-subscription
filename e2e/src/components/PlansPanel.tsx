import { Button, Card } from "./ui";

type Plan = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  isPublic: boolean;
  prices: Array<{
    provider: string;
    currency: string;
    amountCents: number;
    interval: string;
  }>;
  advantages?: Array<{
    value: boolean | number | null;
    overageAllowed: boolean;
    overageUnitPriceCents?: number | null;
    advantage?: { key: string; name: string; valueType: string; unit?: string | null };
  }>;
};

export function PlansPanel({
  plans,
  loading,
  onRefresh,
}: {
  plans: Plan[];
  loading: boolean;
  onRefresh: () => Promise<void> | void;
}) {
  return (
    <Card
      title="Catalogue public"
      description="GET /subscriptions/plans — visible sans être connecté"
      testId="plans-panel"
    >
      <div className="row">
        <Button testId="refresh-plans" onClick={() => void onRefresh()}>
          Rafraîchir les plans
        </Button>
        <span className="muted" data-testid="plans-count">
          {plans.length} plan(s)
        </span>
      </div>

      {loading ? (
        <p className="muted" data-testid="plans-loading">
          Chargement…
        </p>
      ) : plans.length === 0 ? (
        <p className="muted" data-testid="plans-empty">
          Aucun plan public.
        </p>
      ) : (
        <div className="grid three" data-testid="plans-list">
          {plans.map((plan) => (
            <article
              className="plan"
              key={plan.id}
              data-testid={`plan-card-${plan.slug}`}
            >
              <header>
                <h3>{plan.name}</h3>
                <span className="badge" data-testid={`plan-kind-${plan.slug}`}>
                  {plan.kind}
                </span>
              </header>
              <p className="muted">
                slug: <code>{plan.slug}</code>
              </p>
              <p className="muted mono small" data-testid={`plan-id-${plan.slug}`}>
                {plan.id}
              </p>
              <ul className="prices">
                {plan.prices.map((price) => (
                  <li key={`${price.provider}-${price.interval}`}>
                    {price.amountCents / 100} {price.currency} / {price.interval} (
                    {price.provider})
                  </li>
                ))}
              </ul>
              <ul className="advantages" data-testid={`plan-advantages-${plan.slug}`}>
                {plan.advantages?.map((advantage, index) => (
                  <li key={`${advantage.advantage?.key ?? index}`}>
                    <code>{advantage.advantage?.key ?? "?"}</code> ={" "}
                    <strong>{String(advantage.value)}</strong>
                    {advantage.overageAllowed ? (
                      <span className="badge">
                        overage {advantage.overageUnitPriceCents ?? "?"} c/u
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
