import { z } from "zod";

const PHONE_RE = /^\+?[0-9][0-9\s\-()]{5,19}$/;

function phoneDigits(v: string) {
  return v.replace(/\D/g, "").length;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .refine((v) => PHONE_RE.test(v) && phoneDigits(v) >= 7 && phoneDigits(v) <= 15, "Enter a valid phone number");

const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || (PHONE_RE.test(v) && phoneDigits(v) >= 7 && phoneDigits(v) <= 15), "Enter a valid phone number");

const optionalText = (max: number) => z.string().trim().max(max, `Must be ${max} characters or fewer`);

export const leadSchema = z.object({
  name: z.string().trim().min(1, "Lead name is required").max(120, "Name is too long"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(160),
  phone: phoneSchema,
  altPhone: optionalPhone,
  projectId: z.string().min(1, "Select a project"),
  departmentId: z.string().min(1, "Select a department"),
  assignedTo: z.string().min(1, "Select a user to assign"),
  statusId: z.string().min(1, "Select a lead status"),
  sourceId: z.string().min(1, "Select a source"),
  subSourceId: z.string(),
  remarks: optionalText(1000),
  followUpDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date"),
  preferredLocation: optionalText(160),
  budget: optionalText(60),
  notes: optionalText(2000),
});

export type LeadFormValues = z.infer<typeof leadSchema>;

export const emptyLeadForm: LeadFormValues = {
  name: "",
  email: "",
  phone: "",
  altPhone: "",
  projectId: "",
  departmentId: "",
  assignedTo: "",
  statusId: "",
  sourceId: "",
  subSourceId: "",
  remarks: "",
  followUpDate: "",
  preferredLocation: "",
  budget: "",
  notes: "",
};

export const userSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  phone: optionalPhone,
  role: z.enum(["admin", "presales", "sales", "dept_head"]),
  departmentId: z.string(),
  projectIds: z.array(z.string()),
  status: z.enum(["active", "inactive"]),
  canCreateLeads: z.boolean(),
  password: z.string(),
});

export type UserFormValues = z.infer<typeof userSchema>;

/** Server-side payload validation for /api/users. */
export const userApiSchema = userSchema
  .extend({ password: z.string().optional() })
  .superRefine((v, ctx) => {
    if (v.role !== "admin" && !v.departmentId) {
      ctx.addIssue({ code: "custom", path: ["departmentId"], message: "Department is required for this role" });
    }
    if (v.password && v.password.length < 8) {
      ctx.addIssue({ code: "custom", path: ["password"], message: "Password must be at least 8 characters" });
    }
  });
