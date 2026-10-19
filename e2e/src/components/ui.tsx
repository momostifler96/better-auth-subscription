import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({
  title,
  description,
  children,
  testId,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section className="card" data-testid={testId}>
      <header className="card-header">
        <h2>{title}</h2>
        {description ? <p className="muted">{description}</p> : null}
      </header>
      <div className="card-body">{children}</div>
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field" htmlFor={htmlFor}>
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export type LogState = { ok: boolean; text: string } | null;

export function Result({ testId, log }: { testId: string; log: LogState }) {
  if (!log) {
    return (
      <pre className="result result-idle" data-testid={testId}>
        —
      </pre>
    );
  }
  return (
    <pre
      className={log.ok ? "result result-ok" : "result result-error"}
      data-testid={testId}
    >
      {log.text}
    </pre>
  );
}

export function Button({
  testId,
  children,
  type = "button",
  ...rest
}: {
  testId?: string;
  children: ReactNode;
  type?: "button" | "submit";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="button" data-testid={testId} type={type} {...rest}>
      {children}
    </button>
  );
}
