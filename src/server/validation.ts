import { z } from "zod";

export const MIN_PASSWORD = 10;

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().max(128),
});

export const signupSchema = credentialsSchema.extend({
  password: z.string().min(MIN_PASSWORD).max(128),
});

// Ethiopian numbers: 09xxxxxxxx, 07xxxxxxxx or +2519xxxxxxxx; spaces and dashes allowed.
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+251|0)[1-9]\d{8}$/));

export const onboardingSchema = z.object({
  shopName: z.string().trim().min(2).max(120),
  fullName: z.string().trim().min(2).max(120),
  phone: phoneSchema,
});

export const uuidParam = z.string().uuid();

/** Search text from the URL. Characters that mean something to the query filter are dropped. */
export const searchParam = z
  .string()
  .max(60)
  .transform((v) => v.replace(/[,()"\\%_*]/g, " ").trim());

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.union([z.literal(""), phoneSchema]).transform((v) => v || null),
  creditLimit: z
    .union([z.literal(""), z.coerce.number().min(0).max(100_000_000)])
    .transform((v) => (v === "" ? null : v)),
});

export const PAY_METHODS = ["cash", "telebirr", "cbe_birr", "bank", "other"] as const;

export const repaymentSchema = z.object({
  customer: uuidParam,
  amount: z.coerce.number().positive().max(100_000_000),
  method: z.enum(PAY_METHODS),
  reference: z
    .string()
    .trim()
    .max(80)
    .transform((v) => v || undefined),
});

export function formToObject(formData: FormData, keys: readonly string[]) {
  return Object.fromEntries(keys.map((k) => [k, formData.get(k) ?? ""]));
}

export const receiveStockSchema = z.object({
  item: uuidParam,
  qty: z.coerce.number().positive().max(10_000_000),
  cost: z.coerce.number().min(0).max(100_000_000),
  batch: z
    .string()
    .trim()
    .max(60)
    .transform((v) => v || undefined),
});

const optionalName = z
  .string()
  .trim()
  .max(120)
  .transform((v) => v || null);

export const itemSchema = z.object({
  nameEn: z.string().trim().min(2).max(120),
  nameAm: optionalName,
  nameOm: optionalName,
  unit: z.string().trim().min(1).max(20),
  price: z.coerce.number().min(0).max(100_000_000),
  cost: z.coerce.number().min(0).max(100_000_000),
  reorderLevel: z.coerce.number().min(0).max(10_000_000),
});
