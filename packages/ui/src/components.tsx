import {
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import logoUrl from "./logo.svg";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
}

export function Button({ variant = "secondary", size = "md", className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={cx("cf-btn", `cf-btn--${variant}`, size === "sm" && "cf-btn--sm", className)} {...rest} />;
}

export function IconButton({ className, label, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type="button" aria-label={label} title={label} className={cx("cf-icon-btn", className)} {...rest} />;
}

interface FieldShellProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: (id: string) => ReactNode;
}

export function FormField({ label, hint, error, required, children }: FieldShellProps) {
  const id = useId();
  return (
    <div className="cf-field">
      {label && (
        <label className="cf-label" htmlFor={id}>
          {label}
          {required && <span className="cf-label__req">*</span>}
        </label>
      )}
      {children(id)}
      {error ? <span className="cf-error">{error}</span> : hint ? <span className="cf-hint">{hint}</span> : null}
    </div>
  );
}

type ControlSize = { controlSize?: "md" | "sm" };

export function Input({ className, controlSize, ...rest }: InputHTMLAttributes<HTMLInputElement> & ControlSize) {
  return <input className={cx("cf-input", controlSize === "sm" && "cf-input--sm", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx("cf-textarea", className)} {...rest} />;
}

export function Select({ className, controlSize, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & ControlSize) {
  return <select className={cx("cf-select", controlSize === "sm" && "cf-select--sm", className)} {...rest} />;
}

export function Checkbox({ label, className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode }) {
  return (
    <label className={cx("cf-checkbox", className)}>
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}

export function Card({ title, actions, children, className, bodyClassName }: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cx("cf-card", className)}>
      {(title || actions) && (
        <header className="cf-card__header">
          <div className="cf-card__title">{title}</div>
          {actions && <div className="cf-row">{actions}</div>}
        </header>
      )}
      <div className={cx("cf-card__body", bodyClassName)}>{children}</div>
    </section>
  );
}

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

export function Badge({ tone = "neutral", plain, children }: { tone?: Tone; plain?: boolean; children: ReactNode }) {
  return <span className={cx("cf-badge", tone !== "neutral" && `cf-badge--${tone}`, plain && "cf-badge--plain")}>{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="cf-page-header">
      <div>
        <h1 className="cf-page-header__title">{title}</h1>
        {subtitle && <div className="cf-page-header__sub">{subtitle}</div>}
      </div>
      {actions && <div className="cf-page-header__actions">{actions}</div>}
    </div>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="cf-page">{children}</div>;
}

export function EmptyState({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="cf-empty">
      <div className="cf-empty__title">{title}</div>
      {children}
    </div>
  );
}

export function Spinner() {
  return <span className="cf-spinner" role="status" aria-label="Loading" />;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="cf-loading">
      <Spinner />
      {label}
    </div>
  );
}

export function Alert({ tone = "info", title, children }: { tone?: "info" | "warning" | "danger" | "success"; title?: ReactNode; children?: ReactNode }) {
  return (
    <div className={`cf-alert cf-alert--${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <div>
        {title && <div className="cf-alert__title">{title}</div>}
        {children}
      </div>
    </div>
  );
}

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
}

export function Tabs<T extends string>({ items, value, onChange }: { items: readonly TabItem<T>[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="cf-tabs" role="tablist">
      {items.map((item) => (
        <button key={item.value} type="button" role="tab" className="cf-tab" aria-selected={item.value === value} onClick={() => onChange(item.value)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

export function Drawer({ title, onClose, footer, children }: { title: ReactNode; onClose: () => void; footer?: ReactNode; children: ReactNode }) {
  useEscape(onClose);
  return (
    <>
      <div className="cf-overlay" onClick={onClose} />
      <aside className="cf-drawer" role="dialog" aria-modal="true">
        <header className="cf-drawer__header">
          <div className="cf-drawer__title">{title}</div>
          <IconButton label="Close" onClick={onClose}>×</IconButton>
        </header>
        <div className="cf-drawer__body">{children}</div>
        {footer && <footer className="cf-drawer__footer">{footer}</footer>}
      </aside>
    </>
  );
}

export function Dialog({ title, onClose, footer, children }: { title: ReactNode; onClose: () => void; footer?: ReactNode; children?: ReactNode }) {
  useEscape(onClose);
  return (
    <>
      <div className="cf-overlay" onClick={onClose} />
      <div className="cf-dialog" role="dialog" aria-modal="true">
        <div className="cf-dialog__header">{title}</div>
        {children && <div className="cf-dialog__body">{children}</div>}
        {footer && <div className="cf-dialog__footer">{footer}</div>}
      </div>
    </>
  );
}

export function Logo({ height = 22 }: { height?: number }) {
  return <img src={logoUrl} alt="Comfi" style={{ height, display: "block" }} />;
}

export { cx };
