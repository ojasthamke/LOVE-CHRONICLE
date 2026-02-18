import { z } from 'zod';
import { 
  insertStorySchema, 
  insertCommentSchema, 
  insertCategorySchema, 
  insertReportSchema,
  stories, 
  comments, 
  categories, 
  reports,
  users 
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  stories: {
    list: {
      method: 'GET' as const,
      path: '/api/stories' as const,
      input: z.object({
        categoryId: z.coerce.number().optional(),
        search: z.string().optional(),
        sort: z.enum(['latest', 'trending', 'highlight']).optional(),
        limit: z.coerce.number().optional(),
        cursor: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof stories.$inferSelect & { author: typeof users.$inferSelect; category: typeof categories.$inferSelect | null }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/stories/:id' as const,
      responses: {
        200: z.custom<typeof stories.$inferSelect & { author: typeof users.$inferSelect; category: typeof categories.$inferSelect | null }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/stories' as const,
      input: insertStorySchema,
      responses: {
        201: z.custom<typeof stories.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/stories/:id' as const,
      responses: {
        204: z.void(),
        403: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    toggleLike: {
      method: 'POST' as const,
      path: '/api/stories/:id/like' as const,
      responses: {
        200: z.object({ likesCount: z.number(), liked: z.boolean() }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
  comments: {
    list: {
      method: 'GET' as const,
      path: '/api/stories/:storyId/comments' as const,
      responses: {
        200: z.array(z.custom<typeof comments.$inferSelect & { author: typeof users.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/stories/:storyId/comments' as const,
      input: insertCommentSchema.omit({ storyId: true }),
      responses: {
        201: z.custom<typeof comments.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories' as const,
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/categories' as const,
      input: insertCategorySchema,
      responses: {
        201: z.custom<typeof categories.$inferSelect>(),
        403: errorSchemas.unauthorized, // Admin only
      },
    },
  },
  users: {
    me: {
      method: 'GET' as const,
      path: '/api/user/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/user/me' as const,
      input: z.object({
        username: z.string().optional(),
        bio: z.string().optional(),
        isPremium: z.boolean().optional(), // For demo purposes, allow users to toggle premium? Or maybe just admin/stripe. I'll make it editable for now or handled via specific endpoint. Let's strictly strictly limit this in backend.
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/users/:id' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect & { stories: (typeof stories.$inferSelect)[] }>(),
        404: errorSchemas.notFound,
      },
    },
  },
  admin: {
    stats: {
      method: 'GET' as const,
      path: '/api/admin/stats' as const,
      responses: {
        200: z.object({
          totalUsers: z.number(),
          totalStories: z.number(),
          totalComments: z.number(),
          totalReports: z.number(),
          premiumUsers: z.number(),
        }),
        403: errorSchemas.unauthorized,
      },
    },
    reports: {
      list: {
        method: 'GET' as const,
        path: '/api/admin/reports' as const,
        responses: {
          200: z.array(z.custom<typeof reports.$inferSelect & { reporter: typeof users.$inferSelect; story: typeof stories.$inferSelect | null }>()),
        },
      },
      resolve: {
        method: 'PATCH' as const,
        path: '/api/admin/reports/:id' as const,
        input: z.object({ status: z.enum(['resolved', 'dismissed']) }),
        responses: {
          200: z.custom<typeof reports.$inferSelect>(),
        },
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
