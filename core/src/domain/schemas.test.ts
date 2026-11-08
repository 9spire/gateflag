import { describe, expect, it } from 'vitest';
import {
  AccessClientHeaderSchema,
  DescriptionSchema,
  EmailSchema,
  FlagKeySchema,
  GroupKeySchema,
  DefaultTtlDaysSchema,
  accessClientsSchema,
} from './schemas.js';

describe('validation schemas', () => {
  it('normalizes email', () => {
    expect(EmailSchema.parse('  Pat@Example.COM ')).toBe('pat@example.com');
    expect(() => EmailSchema.parse('not-an-email')).toThrow();
  });

  it('uppercases and validates flag keys', () => {
    expect(FlagKeySchema.parse('new_checkout_flow')).toBe('NEW_CHECKOUT_FLOW');
    expect(() => FlagKeySchema.parse('1BAD')).toThrow();
    expect(() => FlagKeySchema.parse('A'.repeat(65))).toThrow();
  });

  it('lowercases and validates group keys', () => {
    expect(GroupKeySchema.parse('Beta-Testers')).toBe('beta-testers');
    expect(() => GroupKeySchema.parse('-bad')).toThrow();
  });

  it('limits descriptions and access clients', () => {
    expect(DescriptionSchema.parse('ok')).toBe('ok');
    expect(() => DescriptionSchema.parse('x'.repeat(501))).toThrow();
    expect(accessClientsSchema().parse(['storefront'])).toEqual(['storefront']);
    expect(() => accessClientsSchema().parse([])).toThrow();
    expect(() => accessClientsSchema().parse(['unknown-app'])).toThrow();
  });

  it('validates defaultTtlDays and access-client header', () => {
    expect(DefaultTtlDaysSchema.parse(null)).toBeNull();
    expect(DefaultTtlDaysSchema.parse(30)).toBe(30);
    expect(() => DefaultTtlDaysSchema.parse(0)).toThrow();
    expect(AccessClientHeaderSchema.parse('checkout')).toBe('checkout');
    expect(() => AccessClientHeaderSchema.parse('nope')).toThrow();
  });
});
