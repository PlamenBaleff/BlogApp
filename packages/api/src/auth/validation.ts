import { z } from 'zod';

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email is too long');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(255, 'Name is too long');

export const registerSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const postSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  contentHtml: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
});

export const postUpdateSchema = postSchema.partial();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type PostUpdateInput = z.infer<typeof postUpdateSchema>;
