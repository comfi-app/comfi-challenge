import { ApiError, type FlowDetail } from "@comfi/kyb-contracts";
import { Alert, Loading } from "@comfi/ui";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useFlowVersionQuery } from "../api";
import { FlowCanvas } from "../canvas/FlowCanvas";
import { errorMessage } from "../format";
import { draftProblems } from "../model/draft-problems";
import { flaggedElementIds, type Selection } from "../model/selection";
import { useFlowDraft } from "../model/use-flow-draft";
import { Inspector } from "../panels/Inspector";
import { ConfirmDialog } from "./ConfirmDialog";
import { EditorTopBar } from "./EditorTopBar";
import { IssuesPanel, type IssueReport } from "./IssuesPanel";
import { ToastView, useToast } from "./toast";
import { useFlowMutations } from "./use-flow-mutations";
import { VersionBanner } from "./VersionBanner";
import { VersionsDrawer } from "./VersionsDrawer";

type Overlay =
  | { kind: "versions" }
  | { kind: "publish" }
  | { kind: "delete-stage"; stageId: string }
  | { kind: "restore"; version: number }
  | { kind: "leave" };

const noFlags: ReadonlySet<string> = new Set();

/** Delete only acts on the canvas selection, never while focus is in a form or a dialog. */
const isCanvasFocus = (target: EventTarget | null) =>
  target === document.body || (target instanceof Element && target.closest(".react-flow") !== null);

export function FlowEditor({ flow }: { flow: FlowDetail }) {
  const navigate = useNavigate();
  const draft = useFlowDraft(flow.draft);
  const mutations = useFlowMutations(flow.id);
  const { toast, showToast, dismissToast } = useToast();

  const [selection, setSelection] = useState<Selection | null>(null);
  const [report, setReport] = useState<IssueReport | null>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const versionQuery = useFlowVersionQuery(flow.id, viewing);

  const isViewingVersion = viewing !== null;
  const definition = isViewingVersion ? versionQuery.data?.definition : draft.definition;
  const flagged = useMemo(
    () => (report && !isViewingVersion ? flaggedElementIds(draft.definition, report.issues) : noFlags),
    [report, isViewingVersion, draft.definition],
  );

  // ---------- commands ----------

  /** Saves the draft; resolves to whether the server now has exactly what is on screen. */
  const save = async (): Promise<boolean> => {
    if (!draft.isDirty) return true;
    if (mutations.save.isPending) return false;
    const toSave = draft.definition;
    const problems = draftProblems(toSave);
    if (problems.length > 0) {
      setReport({ source: "save", issues: problems });
      return false;
    }
    try {
      await mutations.save.mutateAsync(toSave);
      draft.markSaved(toSave);
      setReport((current) => (current?.source === "save" ? null : current));
      return true;
    } catch (error) {
      showToast("danger", `Couldn't save the draft. ${errorMessage(error)}`);
      return false;
    }
  };

  const validate = async () => {
    if (!(await save())) return;
    try {
      const { issues } = await mutations.validate.mutateAsync();
      setReport(issues.length > 0 ? { source: "validate", issues } : null);
      if (issues.length === 0) showToast("success", "No issues found. The draft is ready to publish.");
    } catch (error) {
      showToast("danger", `Couldn't validate the draft. ${errorMessage(error)}`);
    }
  };

  const publish = async () => {
    if (!(await save())) {
      setOverlay(null);
      return;
    }
    try {
      const detail = await mutations.publish.mutateAsync();
      setReport(null);
      showToast("success", `Published v${detail.activeVersion}. New runs start on it from now on.`);
    } catch (error) {
      const issues = error instanceof ApiError ? error.body.issues : undefined;
      if (issues?.length) setReport({ source: "publish", issues });
      else showToast("danger", errorMessage(error));
    }
    setOverlay(null);
  };

  const restore = async (version: number) => {
    try {
      const detail = await mutations.restore.mutateAsync(version);
      draft.reset(detail.draft);
      setViewing(null);
      setSelection(null);
      setReport(null);
      showToast("success", `Restored v${version} into the draft.`);
    } catch (error) {
      showToast("danger", `Couldn't restore v${version}. ${errorMessage(error)}`);
    }
    setOverlay(null);
  };

  const requestRestore = (version: number) => {
    // Restoring overwrites the saved draft, so ask whenever that loses work.
    if (draft.isDirty || flow.hasUnpublishedChanges) setOverlay({ kind: "restore", version });
    else void restore(version);
  };

  const remove = (target: Selection) => {
    // Stages take their steps and transitions with them, so they ask first.
    if (target.kind === "stage") {
      setOverlay({ kind: "delete-stage", stageId: target.id });
      return;
    }
    draft.dispatch(
      target.kind === "transition" ? { type: "transition/remove", transitionId: target.id } : { type: "ending/remove", endingId: target.id },
    );
    setSelection(null);
  };

  const view = (version: number | null) => {
    setViewing(version);
    setSelection(null);
    setOverlay(null);
  };

  const leave = () => {
    if (draft.isDirty) setOverlay({ kind: "leave" });
    else void navigate("..");
  };

  // ---------- keyboard & unload ----------

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (!isViewingVersion) void save();
      return;
    }
    const isDelete = event.key === "Delete" || event.key === "Backspace";
    if (!isDelete || !selection || isViewingVersion || overlay || !isCanvasFocus(event.target)) return;
    event.preventDefault();
    remove(selection);
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    if (!draft.isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draft.isDirty]);

  // ---------- render ----------

  const stageToDelete = overlay?.kind === "delete-stage" ? draft.definition.stages.find((stage) => stage.id === overlay.stageId) : undefined;
  const nextVersion = Math.max(0, ...flow.versions.map((version) => version.version)) + 1;

  return (
    <div className="fc-editor">
      <EditorTopBar
        flow={flow}
        isDirty={draft.isDirty}
        isViewingVersion={isViewingVersion}
        isSaving={mutations.save.isPending}
        isValidating={mutations.validate.isPending}
        onBack={leave}
        onVersions={() => setOverlay({ kind: "versions" })}
        onValidate={() => void validate()}
        onSave={() => void save()}
        onPublish={() => setOverlay({ kind: "publish" })}
      />
      {viewing !== null && (
        <VersionBanner version={viewing} details={versionQuery.data} onBack={() => view(null)} onRestore={() => requestRestore(viewing)} />
      )}

      <div className="fc-editor__body">
        <div className="fc-editor__canvas">
          {definition ? (
            <FlowCanvas
              key={viewing ?? "draft"}
              definition={definition}
              dispatch={draft.dispatch}
              readOnly={isViewingVersion}
              selection={selection}
              onSelectionChange={setSelection}
              flagged={flagged}
            />
          ) : versionQuery.isError ? (
            <div className="fc-editor__state">
              <Alert tone="danger" title={`Couldn't load v${viewing}`}>
                {errorMessage(versionQuery.error)}
              </Alert>
            </div>
          ) : (
            <Loading label={`Loading v${viewing}…`} />
          )}
          {report && !isViewingVersion && (
            <IssuesPanel report={report} definition={draft.definition} onSelect={setSelection} onClose={() => setReport(null)} />
          )}
          {toast && <ToastView toast={toast} onDismiss={dismissToast} />}
        </div>
        {definition && (
          <Inspector definition={definition} selection={selection} dispatch={draft.dispatch} readOnly={isViewingVersion} onDelete={remove} />
        )}
      </div>

      {overlay?.kind === "versions" && (
        <VersionsDrawer versions={flow.versions} viewing={viewing} onView={view} onRestore={requestRestore} onClose={() => setOverlay(null)} />
      )}
      {overlay?.kind === "publish" && (
        <ConfirmDialog
          title={`Publish v${nextVersion}?`}
          confirmLabel={draft.isDirty ? "Save and publish" : "Publish"}
          isPending={mutations.save.isPending || mutations.publish.isPending}
          onConfirm={() => void publish()}
          onClose={() => setOverlay(null)}
        >
          <p>
            New runs will start on v{nextVersion}. Runs already in progress stay on the version they started with, so nobody is moved
            mid-application.
          </p>
          {draft.isDirty && <Alert tone="info">Your unsaved edits will be saved to the draft first.</Alert>}
        </ConfirmDialog>
      )}
      {overlay?.kind === "delete-stage" && stageToDelete && (
        <ConfirmDialog
          title={`Delete “${stageToDelete.name || "Untitled stage"}”?`}
          confirmLabel="Delete stage"
          tone="danger"
          onConfirm={() => {
            draft.dispatch({ type: "stage/remove", stageId: stageToDelete.id });
            setSelection(null);
            setOverlay(null);
          }}
          onClose={() => setOverlay(null)}
        >
          <p>Its steps, fields and every transition into or out of it are removed from the draft.</p>
        </ConfirmDialog>
      )}
      {overlay?.kind === "restore" && (
        <ConfirmDialog
          title={`Restore v${overlay.version} to the draft?`}
          confirmLabel="Restore"
          isPending={mutations.restore.isPending}
          onConfirm={() => void restore(overlay.version)}
          onClose={() => setOverlay(null)}
        >
          <p>
            The draft is replaced with v{overlay.version}.
            {draft.isDirty ? " Your unsaved edits will be lost." : " Changes in the draft that were never published will be lost."}
          </p>
        </ConfirmDialog>
      )}
      {overlay?.kind === "leave" && (
        <ConfirmDialog
          title="Leave without saving?"
          confirmLabel="Discard edits"
          tone="danger"
          onConfirm={() => void navigate("..")}
          onClose={() => setOverlay(null)}
        >
          <p>Your unsaved edits to the draft will be lost.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
