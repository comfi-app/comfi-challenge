import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateTradeLicence, normalizeCompanyName, readTradeLicence } from '../src/checks/trade-licence-rules';

const fixture = (name: string) => readFileSync(resolve(__dirname, '../../../fixtures', name));
const submitted = { companyName: 'Falcon Trading LLC', licenceNumber: 'CN-4815162' };
const today = '2026-11-08';

const check = (name: string) => evaluateTradeLicence({ submitted, extracted: readTradeLicence(fixture(name)), today });
const codes = (name: string) => check(name).reasons.map((reason) => reason.code);

describe('trade licence rules', () => {
  it('approves a matching, valid licence', () => {
    expect(readTradeLicence(fixture('trade-licence-falcon-trading.pdf'))).toEqual({
      companyName: 'Falcon Trading LLC',
      licenceNumber: 'CN-4815162',
      expiryDate: '2028-02-28',
    });
    expect(check('trade-licence-falcon-trading.pdf')).toEqual({ status: 'approved', reasons: [] });
  });

  it('rejects an expired licence', () => {
    expect(check('trade-licence-falcon-trading-expired.pdf').status).toBe('rejected');
    expect(codes('trade-licence-falcon-trading-expired.pdf')).toEqual(['licence_expired']);
  });

  it('rejects a licence for another company with every mismatch', () => {
    expect(check('trade-licence-oasis-logistics.pdf').status).toBe('rejected');
    expect(codes('trade-licence-oasis-logistics.pdf')).toEqual(['licence_number_mismatch', 'company_name_mismatch']);
  });

  it('sends an image to manual review as unreadable', () => {
    expect(readTradeLicence(fixture('trade-licence-photo-blurry.png'))).toBeNull();
    expect(check('trade-licence-photo-blurry.png').status).toBe('manual_review');
    expect(codes('trade-licence-photo-blurry.png')).toEqual(['document_unreadable']);
  });

  it('treats a licence as valid through its expiry date', () => {
    const extracted = { ...submitted, expiryDate: today };
    expect(evaluateTradeLicence({ submitted, extracted, today }).status).toBe('approved');
  });

  it('decodes PDF string escapes', () => {
    const pdf = Buffer.from('%PDF-1.4\n(Licence No: CN-1) Tj (Company: Sand \\(Dunes\\) \\\\ Co) Tj (Expiry date: 2030-01-01) Tj', 'latin1');
    expect(readTradeLicence(pdf)?.companyName).toBe('Sand (Dunes) \\ Co');
  });

  it('compares company names ignoring case, punctuation and whitespace', () => {
    expect(normalizeCompanyName('  falcon   TRADING, l.l.c. ')).toBe(normalizeCompanyName('Falcon Trading LLC'));
    const extracted = { companyName: 'Falcon Trading LLC', licenceNumber: 'cn-481 5162', expiryDate: '2030-01-01' };
    const verdict = evaluateTradeLicence({ submitted: { ...submitted, companyName: 'FALCON  trading l.l.c' }, extracted, today });
    expect(verdict.status).toBe('approved');
  });
});
