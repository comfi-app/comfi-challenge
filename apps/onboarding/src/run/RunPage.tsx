import type { ApplicantRunView } from "@comfi/kyb-contracts";
import { Loading } from "@comfi/ui";
import type { ReactElement } from "react";
import { useParams } from "react-router";
import { isNotFound } from "../api";
import { Screen } from "../layout";
import { currentEntry, stageEntries } from "./model";
import { useRun } from "./queries";
import { ReviewScreen } from "./ReviewScreen";
import { Runner } from "./Runner";
import { BlockedScreen, EndingScreen, LoadErrorScreen, NotFoundScreen } from "./StatusScreens";

export function RunPage() {
  const { token = "" } = useParams();
  const run = useRun(token);

  const view = run.data;

  if (!view) {
    if (isNotFound(run.error)) return <NotFoundScreen />;
    return (
      <Screen>
        {run.isError ? (
          <LoadErrorScreen onRetry={() => void run.refetch()} />
        ) : (
          <Loading label="Loading your onboarding…" />
        )}
      </Screen>
    );
  }
  return (
    <Screen
      context={
        <>
          <span className="ob-header__company">{view.company.name}</span>
          <span className="ob-header__flow">{view.flow.name}</span>
        </>
      }
    >
      <RunContent view={view} />
    </Screen>
  );
}

function RunContent({ view }: { view: ApplicantRunView }): ReactElement {
  switch (view.run.status) {
    case "completed":
      return <EndingScreen view={view} />;
    case "blocked":
      return <BlockedScreen />;
    case "active":
      return <ActiveRun view={view} />;
  }
}

function ActiveRun({ view }: { view: ApplicantRunView }): ReactElement {
  const entries = stageEntries(view);
  const current = currentEntry(view);
  if (!current) return <BlockedScreen />;

  switch (current.application.status) {
    case "in_progress":
    case "returned":
      return <Runner key={current.application.id} token={view.run.linkToken} entries={entries} current={current} />;
    case "in_review":
    case "approved":
    case "rejected":
      return <ReviewScreen entries={entries} current={current} />;
  }
}
