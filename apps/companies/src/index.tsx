import "./companies.css";
import { AdminAppContext, EmptyState, type AdminAppProps } from "@comfi/ui";
import { Link, Route, Routes } from "react-router";
import { CompanyDetailPage } from "./pages/CompanyDetailPage";
import { CompanyListPage } from "./pages/CompanyListPage";

export default function CompaniesApp(props: AdminAppProps) {
  return (
    <AdminAppContext value={props}>
      <Routes>
        <Route index element={<CompanyListPage />} />
        <Route path=":companyId" element={<CompanyDetailPage />} />
        <Route
          path="*"
          element={
            <EmptyState title="Page not found">
              <Link to="/companies">Back to companies</Link>
            </EmptyState>
          }
        />
      </Routes>
    </AdminAppContext>
  );
}
