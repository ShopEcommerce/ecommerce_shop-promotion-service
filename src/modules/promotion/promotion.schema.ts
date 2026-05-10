import { z } from 'zod';

export const createCouponSchema = z.object({
  body: z
    .object({
      code: z.string().min(3, 'Code must be at least 3 characters long').toUpperCase(),
      discountType: z.enum(['PERCENTAGE', 'FIXED'], {
        error: 'Discount type must be either PERCENTAGE or FIXED',
      }),
      discountValue: z.number().positive('Discount value must be a positive number'),
      minOrderValue: z.number().min(0).optional().default(0),
      maxUses: z.number().int().positive('Maximum uses must be a positive integer'),
      validFrom: z.string().datetime('Invalid start date'),
      validUntil: z.string().datetime('Invalid end date'),
      isActive: z.boolean().optional().default(true),
    })
    .refine((data) => new Date(data.validFrom) < new Date(data.validUntil), {
      message: 'End date must be after start date',
      path: ['validUntil'],
    }),
});

export const createPromotionSchema = z.object({
  body: z
    .object({
      name: z.string().min(5, 'Name is too short'),
      description: z.string().optional(),
      thumbnailUrl: z.string().url('Invalid image link').optional(),
      discountType: z.enum(['PERCENTAGE', 'FIXED']),
      discountValue: z.number().positive(),
      appliedProductId: z.string().uuid('Invalid product ID').optional().nullable(),
      appliedCategoryId: z.string().uuid('Invalid category ID').optional().nullable(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      isActive: z.boolean().optional().default(true),
    })
    .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
      message: 'End date must be after start date',
      path: ['endDate'],
    }),
});

export const reserveCouponSchema = z.object({
  body: z.object({
    code: z.string(),
    orderId: z.string().uuid(),
    orderAmount: z.number().positive(),
  }),
});
