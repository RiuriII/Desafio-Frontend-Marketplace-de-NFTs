import { z } from 'zod'

export const avatarSchema = z.union([z.string().regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Use uma imagem PNG, JPEG ou WebP.').max(1_500_000, 'Imagem muito grande.'), z.null()])
export const userSchema = z.object({ id: z.string(), name: z.string(), username: z.string(), email: z.email(), ensName: z.string(), walletNickname: z.string(), avatar: avatarSchema, version: z.number().int().positive() })
export const profileInputSchema = z.object({
  name: z.string().trim().min(3, 'Use pelo menos 3 caracteres.').max(60),
  username: z.string().trim().regex(/^[A-Za-z0-9_-]{3,30}$/, 'Use 3 a 30 letras, números, _ ou -.'),
  email: z.email('Informe um e-mail válido.'),
  ensName: z.string().trim().regex(/^[a-z0-9-]{3,30}$/, 'Use 3 a 30 letras minúsculas, números ou -.'),
  walletNickname: z.string().trim().min(3, 'Use pelo menos 3 caracteres.').max(40),
  avatar: avatarSchema,
})
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  newPassword: z.string().min(8, 'Use pelo menos 8 caracteres.'),
  confirmPassword: z.string(),
}).refine((value) => value.newPassword === value.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não conferem.' })
export const loginSchema = z.object({ email: z.email('Informe um e-mail válido.'), password: z.string().min(1, 'Informe a senha.') })
export const registerSchema = z.object({
  name: z.string().trim().min(3, 'Use pelo menos 3 caracteres.').max(60),
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(8, 'Use pelo menos 8 caracteres.'),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não conferem.' })
export const sessionSchema = z.object({ user: userSchema.nullable(), expiresAt: z.string().nullable() })
export const authResultSchema = z.object({ token: z.string(), user: userSchema, expiresAt: z.string() })
export const apiErrorSchema = z.object({ error: z.object({ code: z.string(), message: z.string(), fieldErrors: z.record(z.string(), z.string()).optional() }) })
export type User = z.infer<typeof userSchema>
export type Session = z.infer<typeof sessionSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ProfileInput = z.infer<typeof profileInputSchema>
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>
