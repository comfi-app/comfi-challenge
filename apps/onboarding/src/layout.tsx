import { Logo, cx } from "@comfi/ui";
import type { ReactNode } from "react";
import { Link } from "react-router";

export function Screen({ context, children }: { context?: ReactNode; children: ReactNode }) {
  return (
    <div className="ob-app">
      <header className="ob-header">
        <div className="ob-header__inner">
          <Link to="/" className="ob-header__logo" aria-label="Comfi home">
            <Logo height={20} />
          </Link>
          {context && <div className="ob-header__context">{context}</div>}
        </div>
      </header>
      {children}
    </div>
  );
}

/** Progress on the side (on top on narrow screens), the current task in the middle. */
export function Workspace({ progress, children }: { progress: ReactNode; children: ReactNode }) {
  return (
    <div className="ob-workspace">
      <aside className="ob-workspace__progress">{progress}</aside>
      <main className="ob-workspace__main">{children}</main>
    </div>
  );
}

export type StatusTone = "success" | "danger" | "warning" | "neutral";

export function StatusCard({ tone, icon, title, children, className }: {
  tone: StatusTone;
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("ob-status", className)} data-tone={tone}>
      <span className="ob-status__icon">{icon}</span>
      <h1 className="ob-status__title">{title}</h1>
      {children}
    </section>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return <main className="ob-centered">{children}</main>;
}
