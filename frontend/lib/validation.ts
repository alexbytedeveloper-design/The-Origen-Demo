import { z } from "zod";

export const BOOKING_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let hour = 12; hour <= 22; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
    slots.push(`${String(hour).padStart(2, "0")}:30`);
  }
  slots.push("23:00");
  return slots;
})();

const MAX_DAYS_AHEAD = 90;
const PHONE_RE = /^[0-9+()\-\s.]{7,32}$/;

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nombre demasiado corto")
    .max(80, "Nombre demasiado largo"),
  email: z
    .string()
    .trim()
    .min(3)
    .max(254)
    .email("Correo no válido"),
  password: z
    .string()
    .min(10, "La contraseña debe tener al menos 10 caracteres")
    .max(128, "La contraseña es demasiado larga")
    .refine((value) => value.trim() === value, {
      message: "La contraseña no puede empezar ni acabar en espacio",
    }),
});

export const loginSchema = z.object({
  email: z.string().trim().min(3).max(254).email("Correo no válido"),
  password: z.string().min(1, "Falta la contraseña").max(128),
});

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return false;
    const today = new Date();
    const startOfToday = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    );
    const diffDays =
      (parsed.getTime() - startOfToday) / (24 * 60 * 60 * 1000);
    return diffDays >= 0 && diffDays <= MAX_DAYS_AHEAD;
  }, "Fecha fuera de plazo");

export const reservationSchema = z.object({
  date: dateString,
  time: z
    .string()
    .refine((value) => BOOKING_SLOTS.includes(value), "Hora fuera de servicio"),
  partySize: z
    .number()
    .int()
    .min(1, "Mínimo una persona")
    .max(8, "Máximo ocho personas"),
  name: z
    .string()
    .trim()
    .min(2, "Nombre demasiado corto")
    .max(80, "Nombre demasiado largo"),
  email: z.string().trim().min(3).max(254).email("Correo no válido"),
  phone: z
    .string()
    .trim()
    .regex(PHONE_RE, "Teléfono no válido")
    .max(32),
  notes: z.string().trim().max(400, "Notas demasiado largas").optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ReservationInputData = z.infer<typeof reservationSchema>;
