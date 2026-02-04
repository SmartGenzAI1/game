import { z } from 'zod';

// Password validation schema - Strong password requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Email validation schema
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(254, 'Email must not exceed 254 characters')
  .email('Invalid email address')
  .toLowerCase()
  .trim();

// Username validation schema
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters long')
  .max(30, 'Username must not exceed 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
  .trim();

// Name/Display name validation schema
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must not exceed 100 characters')
  .trim();

// Bio validation schema
export const bioSchema = z
  .string()
  .max(500, 'Bio must not exceed 500 characters')
  .trim()
  .optional();

// URL validation schema - Prevents javascript:, data:, and other dangerous protocols
export const urlSchema = z
  .string()
  .min(1, 'URL is required')
  .max(2048, 'URL must not exceed 2048 characters')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
        // Block dangerous protocols
        const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'];
        return !dangerousProtocols.some(protocol => parsed.protocol.toLowerCase().startsWith(protocol.replace(':', '')));
      } catch {
        return false;
      }
    },
    'Invalid URL format or dangerous protocol detected'
  )
  .transform((url) => url.startsWith('http') ? url : `https://${url}`);

// Link title validation schema
export const linkTitleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(100, 'Title must not exceed 100 characters')
  .trim();

// Avatar URL validation schema
export const avatarUrlSchema = z
  .string()
  .max(2048, 'Avatar URL must not exceed 2048 characters')
  .url('Invalid avatar URL')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Only allow http and https protocols
        return ['http:', 'https:'].includes(parsed.protocol.toLowerCase());
      } catch {
        return false;
      }
    },
    'Avatar URL must use HTTP or HTTPS protocol'
  )
  .optional();

// Theme validation schema
export const themeSchema = z
  .enum(['default', 'dark', 'blue', 'purple'], {
    errorMap: () => ({ message: 'Invalid theme selected' })
  });

// Login credentials schema
export const loginCredentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Signup credentials schema
export const signupCredentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  full_name: nameSchema,
});

// Update profile schema
export const updateProfileSchema = z.object({
  username: usernameSchema,
  display_name: nameSchema,
  bio: bioSchema,
  theme: themeSchema,
  avatar_url: avatarUrlSchema,
});

// Add link schema
export const addLinkSchema = z.object({
  title: linkTitleSchema,
  url: urlSchema,
});

// Update link schema
export const updateLinkSchema = z.object({
  title: linkTitleSchema.optional(),
  url: urlSchema.optional(),
  isActive: z.boolean().optional(),
});

// Reorder links schema
export const reorderLinksSchema = z.array(
  z.object({
    id: z.string().min(1, 'Link ID is required'),
    position: z.number().int().min(0, 'Position must be a non-negative integer'),
  })
);

// Generate bio schema
export const generateBioSchema = z.object({
  keywords: z
    .string()
    .min(1, 'Keywords are required')
    .max(200, 'Keywords must not exceed 200 characters')
    .trim(),
});

// Link ID schema
export const linkIdSchema = z
  .string()
  .min(1, 'Link ID is required')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid link ID format');

// Username parameter schema (for public pages)
export const usernameParamSchema = z
  .string()
  .min(1, 'Username is required')
  .max(30, 'Username must not exceed 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid username format');

// Sanitize HTML content (for bio, etc.)
export const sanitizeHtmlSchema = z
  .string()
  .transform((value) => {
    // Remove potentially dangerous HTML tags and attributes
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '') // Remove inline event handlers
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '');
  });

// Export all schemas
export const validationSchemas = {
  password: passwordSchema,
  email: emailSchema,
  username: usernameSchema,
  name: nameSchema,
  bio: bioSchema,
  url: urlSchema,
  linkTitle: linkTitleSchema,
  avatarUrl: avatarUrlSchema,
  theme: themeSchema,
  loginCredentials: loginCredentialsSchema,
  signupCredentials: signupCredentialsSchema,
  updateProfile: updateProfileSchema,
  addLink: addLinkSchema,
  updateLink: updateLinkSchema,
  reorderLinks: reorderLinksSchema,
  generateBio: generateBioSchema,
  linkId: linkIdSchema,
  usernameParam: usernameParamSchema,
  sanitizeHtml: sanitizeHtmlSchema,
};
