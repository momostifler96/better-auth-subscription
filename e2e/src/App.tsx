import { useCallback, useEffect, useState } from "react";
import { get } from "./api";
import { authClient } from "./components/auth-client";
import { AdminPanel } from "./components/AdminPanel";
import { AuthPanel } from "./components/AuthPanel";
import { PlansPanel } from "./components/PlansPanel";
import { UserPanel } from "./components/UserPanel";

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

export default function App() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubscriptionId, setActiveSubscriptionId] = useState<string | null>(
    null,
  );

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const result = await get<{ plans: Plan[] }>("/subscriptions/plans");
      if (result.ok) setPlans(result.data?.plans ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const handleAuthChanged = useCallback(async () => {
    await refetch();
    await loadPlans();
  }, [refetch, loadPlans]);

  const currentSession = session as
    | { user?: { email?: string; name?: string; role?: string; id?: string } }
    | null;

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">better-subscriptions · test E2E navigateur</p>
          <h1>Plugin d'abonnements Better Auth</h1>
          <p className="muted">
            Cette application exerce tous les endpoints HTTP du plugin avec une
            base SQLite réelle. Admin pré-créé&nbsp;:{" "}
            <code>admin@e2e.test</code> / <code>Admin123!</code>
          </p>
        </div>
        <div className="hero-status" data-testid="session-status">
          {isPending
            ? "session…"
            : currentSession?.user
              ? `${currentSession.user.email} (${currentSession.user.role})`
              : "non connecté"}
        </div>
      </header>

      <main className="stack">
        <AuthPanel
          client={authClient}
          session={currentSession}
          onAuthChanged={handleAuthChanged}
        />

        <PlansPanel
          plans={plans}
          loading={loading}
          onRefresh={loadPlans}
        />

        {currentSession?.user ? (
          <UserPanel
            session={currentSession}
            plans={plans}
            onSubscriptionChange={setActiveSubscriptionId}
          />
        ) : (
          <p className="muted center" data-testid="user-panel-locked">
            Connectez-vous pour accéder à l'espace utilisateur.
          </p>
        )}

        {currentSession?.user ? (
          <AdminPanel
            onPlansChanged={loadPlans}
            activeSubscriptionId={activeSubscriptionId}
          />
        ) : (
          <p className="muted center" data-testid="admin-panel-locked">
            Connectez-vous pour accéder au panneau administrateur.
          </p>
        )}

        <section className="scenario">
          <h2>Scénario E2E</h2>
          <ol>
            <li>Connexion admin, création d'avantages, plans, promo, partenaire.</li>
            <li>Inscription utilisateur, validation promo, souscription, avantages effectifs.</li>
            <li>Usage dans la limite, tentative de dépassement bloquée (400).</li>
            <li>Autorisation admin du dépassement, puis usage autorisé.</li>
            <li>Changement de plan, annulation immédiate.</li>
            <li>Demande personnalisée, approbation admin, nouvelle souscription.</li>
            <li>Journal d'audit et persistance après rechargement de la page.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
