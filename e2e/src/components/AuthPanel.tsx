import { useState } from "react";
import type { BetterAuthClient } from "./auth-client";
import { Button, Card, Field, Result, type LogState } from "./ui";
import { errorMessage, pretty } from "../api";

export function AuthPanel({
  client,
  session,
  onAuthChanged,
}: {
  client: BetterAuthClient;
  session: { user?: { email?: string; name?: string; role?: string; id?: string } } | null;
  onAuthChanged: () => Promise<void> | void;
}) {
  const [log, setLog] = useState<LogState>(null);
  const [signInEmail, setSignInEmail] = useState("admin@e2e.test");
  const [signInPassword, setSignInPassword] = useState("Admin123!");
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");

  async function signIn() {
    const result = await client.signIn.email({
      email: signInEmail,
      password: signInPassword,
    });
    if (result.error) {
      setLog({ ok: false, text: result.error.message ?? pretty(result.error) });
      return;
    }
    setLog({ ok: true, text: pretty(result.data) });
    await onAuthChanged();
  }

  async function signUp() {
    const result = await client.signUp.email({
      email: signUpEmail,
      password: signUpPassword,
      name: signUpName,
    });
    if (result.error) {
      setLog({ ok: false, text: result.error.message ?? pretty(result.error) });
      return;
    }
    setLog({ ok: true, text: pretty(result.data) });
    await onAuthChanged();
  }

  async function signOut() {
    await client.signOut();
    setLog({ ok: true, text: "Déconnecté" });
    await onAuthChanged();
  }

  return (
    <Card
      title="Authentification Better Auth"
      description="Compte admin pré-créé : admin@e2e.test / Admin123!"
      testId="auth-panel"
    >
      {session?.user ? (
        <div className="auth-session" data-testid="auth-signed-in">
          <div>
            <strong data-testid="auth-user-email">{session.user.email}</strong>
            <span className="badge" data-testid="auth-user-role">
              {session.user.role ?? "user"}
            </span>
            <span className="muted" data-testid="auth-user-id">
              {session.user.id}
            </span>
          </div>
          <Button testId="signout-button" onClick={signOut}>
            Se déconnecter
          </Button>
        </div>
      ) : (
        <p className="muted" data-testid="auth-signed-out">
          Aucune session active.
        </p>
      )}

      <div className="grid two">
        <form
          className="subcard"
          onSubmit={(event) => {
            event.preventDefault();
            void signIn();
          }}
        >
          <h3>Se connecter</h3>
          <Field label="Email" htmlFor="signin-email">
            <input
              id="signin-email"
              data-testid="signin-email"
              value={signInEmail}
              onChange={(event) => setSignInEmail(event.target.value)}
              autoComplete="username"
            />
          </Field>
          <Field label="Mot de passe" htmlFor="signin-password">
            <input
              id="signin-password"
              data-testid="signin-password"
              type="password"
              value={signInPassword}
              onChange={(event) => setSignInPassword(event.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Button testId="signin-submit" type="submit">
            Se connecter
          </Button>
        </form>

        <form
          className="subcard"
          onSubmit={(event) => {
            event.preventDefault();
            void signUp();
          }}
        >
          <h3>Créer un compte</h3>
          <Field label="Nom" htmlFor="signup-name">
            <input
              id="signup-name"
              data-testid="signup-name"
              value={signUpName}
              onChange={(event) => setSignUpName(event.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="signup-email">
            <input
              id="signup-email"
              data-testid="signup-email"
              value={signUpEmail}
              onChange={(event) => setSignUpEmail(event.target.value)}
              autoComplete="username"
            />
          </Field>
          <Field label="Mot de passe" htmlFor="signup-password">
            <input
              id="signup-password"
              data-testid="signup-password"
              type="password"
              value={signUpPassword}
              onChange={(event) => setSignUpPassword(event.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Button testId="signup-submit" type="submit">
            Créer le compte
          </Button>
        </form>
      </div>

      <Result testId="auth-result" log={log} />
    </Card>
  );
}
