import { z } from "zod"

// Validation schema for profile form
export const profileFormSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(255, { message: "El nombre no puede exceder 255 caracteres" })
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, { 
      message: "El nombre solo puede contener letras y espacios" 
    }),
  department: z
    .string()
    .min(2, { message: "El departamento debe tener al menos 2 caracteres" })
    .max(100, { message: "El departamento no puede exceder 100 caracteres" })
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, { 
      message: "El departamento solo puede contener letras y espacios" 
    }),
})

export type ProfileFormValues = z.infer<typeof profileFormSchema>

// Helper function to validate profile form data
export const validateProfileForm = (data: unknown): ProfileFormValues => {
  return profileFormSchema.parse(data)
}

// Helper function to safely validate with error handling
export const safeValidateProfileForm = (data: unknown) => {
  return profileFormSchema.safeParse(data)
}