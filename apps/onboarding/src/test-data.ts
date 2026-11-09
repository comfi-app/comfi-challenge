import type { Field, FieldValue, FileRef, StepValues } from "@comfi/kyb-contracts";
import { loadSample, sampleDocuments } from "./samples";

type Rule<T> = readonly [pattern: RegExp, value: T];

interface DateOffset {
  years?: number;
  days?: number;
}

// Rules are tested against "<key> <label>"; the first match wins.
// Company details match the Falcon Trading sample licence.
const textRules: readonly Rule<string>[] = [
  [/licen[cs]e.?(number|no)/i, "CN-4815162"],
  [/(parent|holding).*name/i, "Falcon Group Holdings Ltd"],
  [/(legal|company|business|trade|registered).?name/i, "Falcon Trading LLC"],
  [/first.?name|given.?name/i, "Ahmed"],
  [/last.?name|surname|family.?name/i, "Al Falasi"],
  [/name/i, "Ahmed Al Falasi"],
  [/e-?mail/i, "ahmed.alfalasi@falcontrading.ae"],
  [/phone|mobile/i, "+971 50 123 4567"],
  [/website|url|domain/i, "https://falcontrading.ae"],
  [/address|street/i, "Office 1402, Bay Square Building 5, Business Bay"],
  [/city|emirate/i, "Dubai"],
  [/country|nationality/i, "United Arab Emirates"],
  [/iban/i, "AE07 0331 2345 6789 0123 456"],
  [/\btrn\b|tax|vat/i, "100234567800003"],
  [/p\.?\s?o\.?\s?box|postal|zip/i, "P.O. Box 123456"],
  [/role|position|designation|job.?title/i, "Director"],
];

const numberRules: readonly Rule<string>[] = [
  [/employee|staff|headcount/i, "24"],
  [/year/i, "2016"],
  [/percent|share|ownership/i, "100"],
  [/revenue|turnover|capital|amount|income|salary/i, "1500000"],
];

const dateRules: readonly Rule<DateOffset>[] = [
  [/birth|dob/i, { years: -36 }],
  [/expir|valid.?(until|to)/i, { years: 1 }],
];

const sampleFileName = "trade-licence-falcon-trading.pdf";

const match = <T>(rules: readonly Rule<T>[], text: string) => rules.find(([pattern]) => pattern.test(text))?.[1];

function isoDate({ years = 0, days = 0 }: DateOffset) {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  date.setDate(date.getDate() + days);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function testValue(field: Field, upload: (file: File) => Promise<FileRef>): Promise<FieldValue> {
  const text = `${field.key} ${field.label}`;
  switch (field.type) {
    case "text":
      return match(textRules, text) ?? `Sample ${field.label.toLowerCase()}`;
    case "email":
      return "ahmed.alfalasi@falcontrading.ae";
    case "phone":
      return "+971 50 123 4567";
    case "date":
      return isoDate(match(dateRules, text) ?? { days: -30 });
    case "number":
      return match(numberRules, text) ?? "10";
    case "select": {
      const options = field.options ?? [];
      return (options.find((option) => !/^other$/i.test(option.label)) ?? options[0])?.value ?? null;
    }
    case "checkbox":
      return true;
    case "file": {
      const sample = sampleDocuments.find((candidate) => candidate.fileName === sampleFileName) ?? sampleDocuments[0];
      return sample ? upload(await loadSample(sample)) : null;
    }
  }
}

/** Plausible answers for any step, so a flow can be walked through quickly while developing. */
export async function generateTestValues(
  fields: readonly Field[],
  upload: (file: File) => Promise<FileRef>,
): Promise<StepValues> {
  const entries = await Promise.all(fields.map(async (field) => [field.key, await testValue(field, upload)] as const));
  return Object.fromEntries(entries);
}
