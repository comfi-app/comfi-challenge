import type { Field, FileRef } from "@comfi/kyb-contracts";
import { Button, IconButton, Spinner, formatBytes } from "@comfi/ui";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState, type DragEvent } from "react";
import { api, errorMessage } from "../api";
import { CloseIcon, FileIcon, UploadIcon } from "../icons";
import { loadSample, sampleDocuments, type SampleDocument } from "../samples";
import { acceptLabel } from "./values";

type UploadSource = File | SampleDocument;

/** Shared with the step form so it can hold submission while an upload is in flight. */
export const uploadMutationKey = (token: string) => ["upload", token] as const;

class FileTypeError extends Error {}

const sourceName = (source: UploadSource) => (source instanceof File ? source.name : source.fileName);

interface FileFieldProps {
  id: string;
  field: Field;
  value: FileRef | null;
  invalid: boolean;
  token: string;
  onChange: (value: FileRef | null) => void;
}

/** Uploads as soon as a file is picked; the field value is the stored file's reference. */
export function FileField({ id, field, value, invalid, token, onChange }: FileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const upload = useMutation({
    mutationKey: uploadMutationKey(token),
    mutationFn: async (source: UploadSource) => {
      const file = source instanceof File ? source : await loadSample(source);
      if (field.accept?.length && !field.accept.includes(file.type)) {
        throw new FileTypeError(`This file type isn't accepted. Please use ${acceptLabel(field.accept)}.`);
      }
      return api.applicant.upload(token, file);
    },
    onSuccess: onChange,
  });

  const onDragLeave = (event: DragEvent) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setDragging(false);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) upload.mutate(file);
  };

  return (
    <div
      className="ob-file"
      data-dragging={dragging || undefined}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="ob-visually-hidden"
        accept={field.accept?.join(",")}
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) upload.mutate(file);
        }}
      />

      {upload.isPending ? (
        <div className="ob-file__box ob-file__uploading" role="status">
          <Spinner />
          <div className="ob-file__meta">
            <div className="ob-file__name">Uploading {upload.variables ? sourceName(upload.variables) : "file"}…</div>
            <div className="ob-progress" />
          </div>
        </div>
      ) : value ? (
        <div className="ob-file__box ob-file__chip">
          <span className="ob-file__icon">
            <FileIcon size={18} />
          </span>
          <div className="ob-file__meta">
            <div className="ob-file__name" title={value.fileName}>
              {value.fileName}
            </div>
            <div className="ob-file__size">{formatBytes(value.size)}</div>
          </div>
          <div className="ob-file__actions">
            <a className="cf-btn cf-btn--ghost cf-btn--sm" href={api.fileUrl(value.fileId)} target="_blank" rel="noreferrer">
              View
            </a>
            <Button size="sm" variant="ghost" onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <IconButton
              label="Remove file"
              onClick={() => {
                upload.reset();
                onChange(null);
              }}
            >
              <CloseIcon />
            </IconButton>
          </div>
        </div>
      ) : (
        <label htmlFor={id} className="ob-dropzone" data-invalid={invalid || undefined}>
          <span className="ob-dropzone__icon">
            <UploadIcon size={18} />
          </span>
          <span>
            <span className="ob-dropzone__action">Choose a file</span> or drag it here
          </span>
          {!field.hint && field.accept?.length ? (
            <span className="ob-dropzone__hint">{acceptLabel(field.accept)}</span>
          ) : null}
        </label>
      )}

      {upload.isError && (
        <span className="cf-error" role="alert">
          {upload.error instanceof FileTypeError
            ? upload.error.message
            : errorMessage(upload.error, "Upload failed. Check your connection and try again.")}
        </span>
      )}

      <SamplePicker disabled={upload.isPending} onPick={(sample) => upload.mutate(sample)} />
    </div>
  );
}

function SamplePicker({ disabled, onPick }: { disabled: boolean; onPick: (sample: SampleDocument) => void }) {
  const [open, setOpen] = useState(false);
  if (sampleDocuments.length === 0) return null;
  return (
    <div className="ob-samples">
      <button
        type="button"
        className="ob-samples__toggle"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <FileIcon size={14} />
        Use a sample document
      </button>
      {open && (
        <ul className="ob-samples__list">
          {sampleDocuments.map((sample) => (
            <li key={sample.fileName}>
              <button
                type="button"
                className="ob-samples__item"
                onClick={() => {
                  setOpen(false);
                  onPick(sample);
                }}
              >
                <FileIcon size={14} />
                {sample.fileName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
