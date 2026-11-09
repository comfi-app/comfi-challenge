import "./applications.css";
import { AdminAppContext, EmptyState, type AdminAppProps } from "@comfi/ui";
import { Link, Route, Routes } from "react-router";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";
import { ApplicationListPage } from "./pages/ApplicationListPage";

export default function ApplicationsApp(props: AdminAppProps) {
  return (
    <AdminAppContext value={props}>
      <Routes>
        <Route index element={<ApplicationListPage />} />
        <Route path=":applicationId" element={<ApplicationDetailPage />} />
        <Route
          path="*"
          element={
            <EmptyState title="Page not found">
              <Link to="/applications">Back to applications</Link>
            </EmptyState>
          }
        />
      </Routes>
    </AdminAppContext>
  );
}
