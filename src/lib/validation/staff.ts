import { z } from "zod";
import { validatePassword } from "@/lib/password";

export const staffSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  name: z.string().trim().min(1, "Name is required").max(100),
  password: z.string().superRefine((pw, ctx) => {
    for (const message of validatePassword(pw)) ctx.addIssue({ code: "custom", message });
  }),
});

export type StaffInput = z.input<typeof staffSchema>;
