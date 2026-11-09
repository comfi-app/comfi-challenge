import type { StoredFile } from "@comfi/kyb-contracts";
import { Card, EmptyState, FileLink, formatBytes, formatDateTime, useAdminApp } from "@comfi/ui";

export function DocumentsCard({ files }: { files: readonly StoredFile[] }) {
  const { api } = useAdminApp();
  return (
    <Card title="Documents" bodyClassName="cf-card__body--flush">
      {files.length === 0 ? (
        <EmptyState title="No documents yet">Files the applicant uploads appear here.</EmptyState>
      ) : (
        <div className="cf-table-wrap">
          <table className="cf-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Field</th>
                <th>Size</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.fileId}>
                  <td className="co-file-cell">
                    <FileLink file={file} href={api.fileUrl(file.fileId)} showSize={false} />
                  </td>
                  <td>{file.fieldKey ? <code>{file.fieldKey}</code> : <span className="cf-muted">Not submitted</span>}</td>
                  <td className="co-nowrap">{formatBytes(file.size)}</td>
                  <td className="co-nowrap">{formatDateTime(file.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
