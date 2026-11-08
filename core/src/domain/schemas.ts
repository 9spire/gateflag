import { z } from 'zod';

export const DEFAULT_ALLOWED_ACCESS_CLIENTS = [
  'storefront',
  'checkout',
  'support-portal',
] as const;

export const UniversalStateSchema = z.enum(['DISABLED', 'GATED', 'RELEASED']);
export const RoleSchema = z.enum(['developer', 'access', 'none']);
export const CreateUniversalStateSchema = z.enum(['GATED', 'RELEASED']);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.string().regex(emailRegex, 'Invalid email'));

export const FlagKeySchema = z
  .string()
  .transform((value) => value.trim().toUpperCase())
  .pipe(
    z
      .string()
      .min(1)
      .max(64)
      .regex(
        /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/,
        'Flag key must be UPPER_SNAKE_CASE',
      ),
  );

export const GroupKeySchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(1)
      .max(64)
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        'Group key must be lowercase kebab-case',
      ),
  );

export const DescriptionSchema = z.string().max(500);

export function accessClientsSchema(allowed: readonly string[] = DEFAULT_ALLOWED_ACCESS_CLIENTS) {
  const allowedSet = new Set(allowed);
  return z
    .array(z.string())
    .min(1)
    .superRefine((clients, ctx) => {
      for (const client of clients) {
        if (!allowedSet.has(client)) {
          ctx.addIssue({
            code: 'custom',
            message: `Access client "${client}" is not allowed`,
          });
        }
      }
    });
}

export const DefaultTtlDaysSchema = z.union([
  z.null(),
  z.number().int().min(1).max(365),
]);

export const AccessClientHeaderSchema = z
  .string()
  .min(1)
  .superRefine((client, ctx) => {
    if (!(DEFAULT_ALLOWED_ACCESS_CLIENTS as readonly string[]).includes(client)) {
      ctx.addIssue({
        code: 'custom',
        message: `Access client "${client}" is not allowed`,
      });
    }
  });
