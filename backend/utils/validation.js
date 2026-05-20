import { z } from 'zod';

/**
 * Validation schemas using Zod for type-safe input validation
 */

export const registerSchema = z.object({
  full_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),

  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  phone_number: z.string()
    .regex(/^0\d{9}$/, 'Phone number must be 10 digits starting with 0')
    .trim()
    .optional(),

  country: z.string()
    .min(2, 'Country must be specified')
    .max(50)
    .optional()
});

export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),

  password: z.string()
    .min(1, 'Password is required')
});

export const walletFundSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .min(6, 'Minimum funding amount is GH₵6')
    .max(1000000, 'Maximum funding amount is GH₵1,000,000')
});

export const dataPurchaseSchema = z.object({
  network: z.enum(['MTN', 'TELECEL', 'AIRTEL_TIGO'], {
    errorMap: () => ({ message: 'Invalid network. Must be MTN, TELECEL, or AIRTEL_TIGO' })
  }),

  phone_number: z.string()
    .regex(/^0\d{9}$/, 'Phone number must be 10 digits starting with 0')
    .trim(),

  data_plan_id: z.number()
    .int()
    .positive('Invalid data plan'),

  amount: z.number()
    .positive('Amount must be positive')
    .min(1, 'Minimum purchase amount is GH₵1')
});

export const publishAdSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Title must not exceed 150 characters')
    .trim(),

  image_url: z.string()
    .url('Invalid image URL')
    .trim(),

  target_link: z.string()
    .url('Invalid target link')
    .trim()
    .optional(),

  is_active: z.boolean()
    .default(true)
});

/**
 * Validate data against a schema
 * @param {z.ZodSchema} schema - Zod validation schema
 * @param {any} data - Data to validate
 * @returns {Object} { success: boolean, data?: any, errors?: Array }
 */
export const validate = (schema, data) => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    return { success: false, errors: [{ message: 'Validation failed' }] };
  }
};

/**
 * Sanitize string input to prevent XSS and script injection attacks
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '') // Remove iframe tags
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '') // Remove object tags
    .replace(/<embed[\s\S]*?>/gi, '') // Remove embed tags
    .replace(/<link[\s\S]*?>/gi, '') // Remove link tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers (onclick, onerror, etc.)
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '') // Remove unquoted event handlers
    .replace(/javascript\s*:/gi, '') // Remove javascript: URIs
    .replace(/data\s*:\s*text\/html/gi, '') // Remove data:text/html URIs
    .replace(/vbscript\s*:/gi, '') // Remove vbscript: URIs
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions
    .replace(/<[^>]*>/g, '') // Remove all remaining HTML tags
    .substring(0, 10000); // Limit length to prevent DoS
};

/**
 * Deep sanitize all string values in an object
 * @param {any} obj - Object to sanitize
 * @returns {any} Sanitized object
 */
export const sanitizeObject = (obj) => {
  if (typeof obj === 'string') return sanitizeInput(obj);
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Don't sanitize password fields (they can contain special chars)
    if (key === 'password' || key === 'current_password' || key === 'new_password' || key === 'password_hash') {
      sanitized[key] = value;
    } else {
      sanitized[key] = sanitizeObject(value);
    }
  }
  return sanitized;
};
