export const REASON_CODES = [
  'document_unreadable',
  'licence_number_mismatch',
  'company_name_mismatch',
  'licence_expired',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export interface Reason {
  code: ReasonCode;
  message: string;
}

export interface ExtractedLicence {
  companyName: string;
  licenceNumber: string;
  /** ISO calendar date, `YYYY-MM-DD`. */
  expiryDate: string;
}

export interface SubmittedLicence {
  companyName: string;
  licenceNumber: string;
}

export interface Verdict {
  status: 'approved' | 'rejected' | 'manual_review';
  reasons: Reason[];
}

const PDF_MAGIC = '%PDF-';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const FIELD_LABELS = {
  licenceNumber: /^Licence No:\s*(.+)$/,
  companyName: /^Company:\s*(.+)$/,
  expiryDate: /^Expiry date:\s*(.+)$/,
} satisfies Record<keyof ExtractedLicence, RegExp>;

/**
 * Reads the licence fields printed on a document. Only text-based PDFs are
 * readable; images and PDFs without the expected fields yield `null`.
 */
export function readTradeLicence(document: Uint8Array): ExtractedLicence | null {
  const text = Buffer.from(document).toString('latin1');
  if (!text.startsWith(PDF_MAGIC)) return null;

  const found: Partial<ExtractedLicence> = {};
  for (const line of pdfTextStrings(text)) {
    for (const [field, pattern] of Object.entries(FIELD_LABELS) as [keyof ExtractedLicence, RegExp][]) {
      const value = pattern.exec(line.trim())?.[1]?.trim();
      if (value && found[field] === undefined) found[field] = value;
    }
  }

  const { companyName, licenceNumber, expiryDate } = found;
  if (!companyName || !licenceNumber || !expiryDate || !isCalendarDate(expiryDate)) return null;
  return { companyName, licenceNumber, expiryDate };
}

/** Yields the literal strings `( … )` of a PDF, with escape sequences decoded. */
function* pdfTextStrings(pdf: string): Generator<string> {
  let i = 0;
  while (i < pdf.length) {
    if (pdf[i] !== '(') {
      i++;
      continue;
    }
    let depth = 1;
    let value = '';
    i++;
    while (i < pdf.length && depth > 0) {
      const char = pdf[i]!;
      if (char === '\\') {
        const next = pdf[i + 1] ?? '';
        value += next === 'n' ? '\n' : next === 'r' ? '\r' : next === 't' ? '\t' : next;
        i += 2;
        continue;
      }
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (depth > 0) value += char;
      i++;
    }
    yield value;
  }
}

function isCalendarDate(value: string): boolean {
  return ISO_DATE.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
}

export function normalizeLicenceNumber(value: string): string {
  return value.toUpperCase().replace(/\s+/g, '');
}

export function normalizeCompanyName(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Today's calendar date in the UAE (`Asia/Dubai`), `YYYY-MM-DD`. */
export function uaeToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(now);
}

export function evaluateTradeLicence(input: {
  submitted: SubmittedLicence;
  extracted: ExtractedLicence | null;
  /** Reference date, `YYYY-MM-DD`. A licence is valid through its expiry date. */
  today: string;
}): Verdict {
  const { submitted, extracted, today } = input;
  if (!extracted) {
    return {
      status: 'manual_review',
      reasons: [
        {
          code: 'document_unreadable',
          message: 'The licence details could not be read from the document. A reviewer will check it manually.',
        },
      ],
    };
  }

  const reasons: Reason[] = [];
  if (normalizeLicenceNumber(extracted.licenceNumber) !== normalizeLicenceNumber(submitted.licenceNumber)) {
    reasons.push({
      code: 'licence_number_mismatch',
      message: `Licence number on the document (${extracted.licenceNumber}) does not match the submitted licence number (${submitted.licenceNumber}).`,
    });
  }
  if (normalizeCompanyName(extracted.companyName) !== normalizeCompanyName(submitted.companyName)) {
    reasons.push({
      code: 'company_name_mismatch',
      message: `Company name on the document (${extracted.companyName}) does not match the submitted company name (${submitted.companyName}).`,
    });
  }
  if (extracted.expiryDate < today) {
    reasons.push({
      code: 'licence_expired',
      message: `The licence expired on ${extracted.expiryDate}.`,
    });
  }

  return { status: reasons.length > 0 ? 'rejected' : 'approved', reasons };
}
