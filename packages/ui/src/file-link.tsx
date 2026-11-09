import type { FileRef } from "@comfi/kyb-contracts";
import { formatBytes } from "./format";

const extensionOf = (fileName: string) => {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1, dot + 5).toUpperCase() : "FILE";
};

/** Opens a stored file in a new tab. */
export function FileLink({ file, href, showSize = true }: { file: FileRef; href: string; showSize?: boolean }) {
  return (
    <a className="cf-file-link" href={href} target="_blank" rel="noreferrer">
      <span className="cf-file-link__ext" aria-hidden>
        {extensionOf(file.fileName)}
      </span>
      <span className="cf-file-link__name">{file.fileName}</span>
      {showSize && <span className="cf-file-link__size">{formatBytes(file.size)}</span>}
    </a>
  );
}
