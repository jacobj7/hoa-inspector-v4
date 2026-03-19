import { z } from "zod";

export const createPropertySchema = z.object({
  address: z
    .string()
    .min(1, "Address is required")
    .max(500, "Address too long"),
  city: z.string().min(1, "City is required").max(100, "City too long"),
  state: z.string().min(2, "State is required").max(50, "State too long"),
  zip_code: z
    .string()
    .min(5, "ZIP code must be at least 5 characters")
    .max(10, "ZIP code too long")
    .regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format"),
  property_type: z
    .enum(["residential", "commercial", "industrial", "mixed_use"], {
      errorMap: () => ({ message: "Invalid property type" }),
    })
    .optional(),
  owner_name: z
    .string()
    .min(1, "Owner name is required")
    .max(200, "Owner name too long"),
  owner_email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email too long")
    .optional()
    .nullable(),
  owner_phone: z
    .string()
    .max(20, "Phone number too long")
    .regex(/^[\d\s\-\+\(\)\.]+$/, "Invalid phone number format")
    .optional()
    .nullable(),
  description: z
    .string()
    .max(2000, "Description too long")
    .optional()
    .nullable(),
  lot_size: z
    .number()
    .positive("Lot size must be positive")
    .optional()
    .nullable(),
  year_built: z
    .number()
    .int("Year must be an integer")
    .min(1800, "Year built must be after 1800")
    .max(new Date().getFullYear(), "Year built cannot be in the future")
    .optional()
    .nullable(),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

export const createViolationSchema = z.object({
  property_id: z
    .number()
    .int("Property ID must be an integer")
    .positive("Property ID must be positive"),
  violation_type: z
    .string()
    .min(1, "Violation type is required")
    .max(200, "Violation type too long"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description too long"),
  severity: z
    .enum(["low", "medium", "high", "critical"], {
      errorMap: () => ({ message: "Invalid severity level" }),
    })
    .default("medium"),
  reported_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional()
    .nullable(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional()
    .nullable(),
  inspector_notes: z
    .string()
    .max(5000, "Inspector notes too long")
    .optional()
    .nullable(),
  fine_amount: z
    .number()
    .nonnegative("Fine amount cannot be negative")
    .optional()
    .nullable(),
  attachments: z
    .array(z.string().url("Invalid attachment URL"))
    .optional()
    .default([]),
});

export type CreateViolationInput = z.infer<typeof createViolationSchema>;

export const updateViolationStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed", "appealed"], {
    errorMap: () => ({ message: "Invalid violation status" }),
  }),
  resolution_notes: z
    .string()
    .max(5000, "Resolution notes too long")
    .optional()
    .nullable(),
  resolved_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional()
    .nullable(),
  fine_paid: z.boolean().optional().nullable(),
  fine_paid_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional()
    .nullable(),
});

export type UpdateViolationStatusInput = z.infer<
  typeof updateViolationStatusSchema
>;

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  email: z.string().email("Invalid email address").max(255, "Email too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
  role: z
    .enum(["admin", "inspector", "viewer"], {
      errorMap: () => ({ message: "Invalid role" }),
    })
    .default("viewer"),
  department: z
    .string()
    .max(200, "Department name too long")
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(20, "Phone number too long")
    .regex(/^[\d\s\-\+\(\)\.]+$/, "Invalid phone number format")
    .optional()
    .nullable(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
