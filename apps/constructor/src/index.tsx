import "@xyflow/react/dist/style.css";
import "./styles.css";
import type { AdminAppProps } from "@comfi/ui";
import { Route, Routes } from "react-router";
import { ApiProvider } from "./api";
import { EditorPage } from "./pages/EditorPage";
import { FlowsPage } from "./pages/FlowsPage";

export default function ConstructorApp({ api }: AdminAppProps) {
  return (
    <ApiProvider value={api}>
      <Routes>
        <Route index element={<FlowsPage />} />
        <Route path=":flowId" element={<EditorPage />} />
      </Routes>
    </ApiProvider>
  );
}
