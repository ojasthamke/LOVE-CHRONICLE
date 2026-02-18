import { db } from "./db";
import { 
  stories, comments, users, categories, likes, reports,
  type Story, type InsertStory, 
  type Comment, type InsertComment,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Report, type InsertReport,
  type Like, type AdminStats
} from "@shared/schema";
import { eq, desc, and, sql, ilike } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";

export interface IStorage {
  // Users (Using AuthStorage for basic ops + extensions)
  getUser(id: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Stories
  getStories(filters?: { 
    categoryId?: number; 
    search?: string; 
    sort?: 'latest' | 'trending' | 'highlight';
    limit?: number;
    cursor?: number;
  }): Promise<(Story & { author: User; category: Category | null })[]>;
  getStory(id: number): Promise<(Story & { author: User; category: Category | null }) | undefined>;
  createStory(story: InsertStory): Promise<Story>;
  deleteStory(id: number): Promise<void>;
  
  // Comments
  getComments(storyId: number): Promise<(Comment & { author: User })[]>;
  createComment(comment: InsertComment): Promise<Comment>;

  // Likes
  getLike(userId: string, storyId: number): Promise<Like | undefined>;
  toggleLike(userId: string, storyId: number): Promise<{ liked: boolean; likesCount: number }>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Reports & Admin
  createReport(report: InsertReport): Promise<Report>;
  getReports(): Promise<(Report & { reporter: User; story: Story | null })[]>;
  updateReportStatus(id: number, status: 'resolved' | 'dismissed'): Promise<Report>;
  getAdminStats(): Promise<AdminStats>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    return authStorage.getUser(id);
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getStories(filters: { 
    categoryId?: number; 
    search?: string; 
    sort?: 'latest' | 'trending' | 'highlight';
    limit?: number;
    cursor?: number; // using ID based cursor for simplicity or offset? Let's use limit/offset or just getAll for MVP if small. 
    // Actually, simple list for MVP.
  } = {}): Promise<(Story & { author: User; category: Category | null })[]> {
    let query = db.select({
      story: stories,
      author: users,
      category: categories,
    })
    .from(stories)
    .innerJoin(users, eq(stories.authorId, users.id))
    .leftJoin(categories, eq(stories.categoryId, categories.id));

    const conditions = [];
    if (filters.categoryId) {
      conditions.push(eq(stories.categoryId, filters.categoryId));
    }
    if (filters.search) {
      conditions.push(ilike(stories.title, `%${filters.search}%`));
    }
    
    if (conditions.length > 0) {
      // @ts-ignore
      query.where(and(...conditions));
    }

    if (filters.sort === 'trending') {
      query.orderBy(desc(stories.likesCount), desc(stories.commentsCount));
    } else if (filters.sort === 'highlight') {
       query.orderBy(desc(stories.isHighlight), desc(stories.createdAt));
    } else {
      query.orderBy(desc(stories.createdAt));
    }

    if (filters.limit) {
      query.limit(filters.limit);
    }

    const results = await query;
    return results.map(r => ({ ...r.story, author: r.author, category: r.category }));
  }

  async getStory(id: number): Promise<(Story & { author: User; category: Category | null }) | undefined> {
    const [result] = await db.select({
      story: stories,
      author: users,
      category: categories,
    })
    .from(stories)
    .innerJoin(users, eq(stories.authorId, users.id))
    .leftJoin(categories, eq(stories.categoryId, categories.id))
    .where(eq(stories.id, id));

    if (!result) return undefined;
    return { ...result.story, author: result.author, category: result.category };
  }

  async createStory(story: InsertStory): Promise<Story> {
    const [newStory] = await db.insert(stories).values(story).returning();
    return newStory;
  }

  async deleteStory(id: number): Promise<void> {
    await db.delete(stories).where(eq(stories.id, id));
  }

  async getComments(storyId: number): Promise<(Comment & { author: User })[]> {
    const results = await db.select({
      comment: comments,
      author: users,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.storyId, storyId))
    .orderBy(desc(comments.createdAt));

    return results.map(r => ({ ...r.comment, author: r.author }));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    
    // Increment comment count
    await db.update(stories)
      .set({ commentsCount: sql`${stories.commentsCount} + 1` })
      .where(eq(stories.id, comment.storyId));

    return newComment;
  }

  async getLike(userId: string, storyId: number): Promise<Like | undefined> {
    const [like] = await db.select().from(likes).where(and(eq(likes.userId, userId), eq(likes.storyId, storyId)));
    return like;
  }

  async toggleLike(userId: string, storyId: number): Promise<{ liked: boolean; likesCount: number }> {
    const existingLike = await this.getLike(userId, storyId);
    let liked = false;

    if (existingLike) {
      await db.delete(likes).where(eq(likes.id, existingLike.id));
      await db.update(stories)
        .set({ likesCount: sql`${stories.likesCount} - 1` })
        .where(eq(stories.id, storyId));
    } else {
      await db.insert(likes).values({ userId, storyId });
      await db.update(stories)
        .set({ likesCount: sql`${stories.likesCount} + 1` })
        .where(eq(stories.id, storyId));
      liked = true;
    }

    const [story] = await db.select().from(stories).where(eq(stories.id, storyId));
    return { liked, likesCount: story.likesCount };
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [newReport] = await db.insert(reports).values(report).returning();
    return newReport;
  }

  async getReports(): Promise<(Report & { reporter: User; story: Story | null })[]> {
    const results = await db.select({
      report: reports,
      reporter: users,
      story: stories,
    })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .leftJoin(stories, eq(reports.storyId, stories.id));
    
    return results.map(r => ({ ...r.report, reporter: r.reporter, story: r.story }));
  }

  async updateReportStatus(id: number, status: 'resolved' | 'dismissed'): Promise<Report> {
    const [updatedReport] = await db.update(reports)
      .set({ status })
      .where(eq(reports.id, id))
      .returning();
    return updatedReport;
  }

  async getAdminStats(): Promise<AdminStats> {
    const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [storiesCount] = await db.select({ count: sql<number>`count(*)` }).from(stories);
    const [commentsCount] = await db.select({ count: sql<number>`count(*)` }).from(comments);
    const [reportsCount] = await db.select({ count: sql<number>`count(*)` }).from(reports);
    const [premiumCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isPremium, true));

    return {
      totalUsers: Number(usersCount.count),
      totalStories: Number(storiesCount.count),
      totalComments: Number(commentsCount.count),
      totalReports: Number(reportsCount.count),
      premiumUsers: Number(premiumCount.count),
    };
  }
}

export const storage = new DatabaseStorage();
