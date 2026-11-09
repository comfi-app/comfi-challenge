import ApplicationsApp from "@comfi/applications";
import CompaniesApp from "@comfi/companies";
import ConstructorApp from "@comfi/constructor";
import { createKybClient } from "@comfi/kyb-contracts";
import { EmptyState, Logo, type AdminAppProps } from "@comfi/ui";
import { Navigate, NavLink, Route, Routes } from "react-router";

const appProps: AdminAppProps = {
  api: createKybClient(import.meta.env.VITE_KYB_API_URL ?? "http://localhost:4000"),
  onboardingUrl: (linkToken) => `${import.meta.env.VITE_ONBOARDING_URL ?? "http://localhost:5174"}/r/${linkToken}`,
};

const nav = [
  { to: "/applications", label: "Applications", icon: "▤" },
  { to: "/companies", label: "Companies", icon: "◫" },
  { to: "/flows", label: "Flow constructor", icon: "⌘" },
] as const;

export function Shell() {
  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="shell__brand">
          <Logo height={20} />
          <span className="shell__product">Operations</span>
        </div>
        <nav className="shell__nav">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} className="shell__link">
              <span className="shell__icon" aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="shell__footer">
          <div className="shell__avatar" aria-hidden>OP</div>
          <div>
            <div className="shell__user">Operations team</div>
            <div className="shell__role">Staff</div>
          </div>
        </div>
      </aside>
      <main className="shell__main">
        <Routes>
          <Route index element={<Navigate to="/applications" replace />} />
          <Route path="/applications/*" element={<ApplicationsApp {...appProps} />} />
          <Route path="/companies/*" element={<CompaniesApp {...appProps} />} />
          <Route path="/flows/*" element={<ConstructorApp {...appProps} />} />
          <Route path="*" element={<EmptyState title="Page not found">This page doesn't exist.</EmptyState>} />
        </Routes>
      </main>
    </div>
  );
}
