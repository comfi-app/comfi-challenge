import type { Field, FileRef } from "@comfi/kyb-contracts";
import { describe, expect, it } from "vitest";
import { validateStepValues } from "../src/engine/field-values";

const field = (key: string, type: Field["type"], extra: Partial<Field> = {}): Field => ({
  id: `field-${key}`,
  key,
  label: key,
  type,
  required: true,
  ...extra,
});

const licence: FileRef = {
  fileId: "3b241101-e2bb-4255-8caf-4136c566a962",
  fileName: "licence.pdf",
  mimeType: "application/pdf",
  size: 2048,
};
const files = new Map([[licence.fileId, licence]]);

describe("validateStepValues", () => {
  const fields = [
    field("email", "email"),
    field("dob", "date"),
    field("employees", "number"),
    field("form", "select", { options: [{ value: "llc", label: "LLC" }] }),
    field("terms", "checkbox"),
    field("licence", "file", { accept: ["application/pdf"] }),
    field("website", "text", { required: false }),
  ];

  it("accepts valid answers, trims text and fills optional blanks with null", () => {
    const result = validateStepValues(
      fields,
      {
        email: " ops@falcon.ae ",
        dob: "1990-02-28",
        employees: "12",
        form: "llc",
        terms: true,
        licence: { ...licence, fileName: "renamed-by-client.pdf" },
      },
      files,
    );
    expect(result).toEqual({
      ok: true,
      values: {
        email: "ops@falcon.ae",
        dob: "1990-02-28",
        employees: "12",
        form: "llc",
        terms: true,
        licence,
        website: null,
      },
    });
  });

  it("reports an error per field", () => {
    const result = validateStepValues(
      fields,
      { email: "ops@", dob: "1990-02-30", employees: "12a", form: "branch", terms: false, licence: null, extra: "x" },
      files,
    );
    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        extra: "Unknown field",
        email: "Enter a valid email address",
        dob: "Enter a date as YYYY-MM-DD",
        employees: "Enter a number",
        form: "Choose one of the options",
        terms: "Please confirm to continue",
        licence: "This field is required",
      },
    });
  });

  it("only accepts files of this run with an allowed type", () => {
    const png: FileRef = { ...licence, fileId: "9c5b94b1-35ad-49bb-b118-8e8fc24abf80", mimeType: "image/png" };
    const licenceField = [field("licence", "file", { accept: ["application/pdf"] })];
    expect(validateStepValues(licenceField, { licence: png }, new Map())).toEqual({
      ok: false,
      fieldErrors: { licence: "File not found" },
    });
    expect(validateStepValues(licenceField, { licence: png }, new Map([[png.fileId, png]]))).toEqual({
      ok: false,
      fieldErrors: { licence: "This file type is not accepted" },
    });
  });

  it("rejects values of the wrong kind", () => {
    const result = validateStepValues([field("name", "text"), field("terms", "checkbox")], { name: true, terms: "yes" }, files);
    expect(result).toEqual({ ok: false, fieldErrors: { name: "Expected text", terms: "Expected true or false" } });
  });
});
