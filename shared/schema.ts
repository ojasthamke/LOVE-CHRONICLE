import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";
import { relations } from "drizzle-orm";

export * from "./models/auth";

// Users relations
export const usersRelations = relations(users, ({ many }) => ({
  stories: many(stories),
  comments: many(comments),
  likes: many(likes),
  reports: many(reports),
}));

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  slug: varchar("slug").notNull().unique(),
  description: text("description"),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  stories: many(stories),
}));

export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  categoryId: integer("category_id").references(() => categories.id),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  isHighlight: boolean("is_highlight").default(false).notNull(), // Paid feature
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const storiesRelations = relations(stories, ({ one, many }) => ({
  author: one(users, {
    fields: [stories.authorId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [stories.categoryId],
    references: [categories.id],
  }),
  comments: many(comments),
  likes: many(likes),
}));

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  storyId: integer("story_id").notNull().references(() => stories.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  story: one(stories, {
    fields: [comments.storyId],
    references: [stories.id],
  }),
}));

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  storyId: integer("story_id").notNull().references(() => stories.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  story: one(stories, {
    fields: [likes.storyId],
    references: [stories.id],
  }),
}));

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  storyId: integer("story_id").references(() => stories.id),
  commentId: integer("comment_id").references(() => comments.id),
  reason: text("reason").notNull(),
  status: varchar("status", { enum: ["pending", "resolved", "dismissed"] }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
  }),
  story: one(stories, {
    fields: [reports.storyId],
    references: [stories.id],
  }),
  comment: one(comments, {
    fields: [reports.commentId],
    references: [comments.id],
  }),
}));

// Schemas
export const insertStorySchema = createInsertSchema(stories).omit({ 
  id: true, 
  authorId: true, 
  likesCount: true, 
  commentsCount: true, 
  createdAt: true 
});
export const insertCommentSchema = createInsertSchema(comments).omit({ 
  id: true, 
  authorId: true, 
  createdAt: true 
});
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertReportSchema = createInsertSchema(reports).omit({ 
  id: true, 
  reporterId: true, 
  status: true, 
  createdAt: true 
});

// Types
export type Story = typeof stories.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Like = typeof likes.$inferSelect;

// Admin Stats Type
export type AdminStats = {
  totalUsers: number;
  totalStories: number;
  totalComments: number;
  totalReports: number;
  premiumUsers: number;
};
