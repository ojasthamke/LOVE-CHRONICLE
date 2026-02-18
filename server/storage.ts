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

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
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
  createStory(story: { title: string; content: string; authorId: number; categoryId?: number; isAnonymous?: boolean }): Promise<Story>;
  deleteStory(id: number): Promise<void>;
  
  // Comments
  getComments(storyId: number): Promise<(Comment & { author: User })[]>;
  createComment(comment: { content: string; authorId: number; storyId: number }): Promise<Comment>;

  // Likes
  getLike(userId: number, storyId: number): Promise<Like | undefined>;
  toggleLike(userId: number, storyId: number): Promise<{ liked: boolean; likesCount: number }>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Reports & Admin
  createReport(report: { reporterId: number; storyId?: number; commentId?: number; reason: string }): Promise<Report>;
  getReports(): Promise<(Report & { reporter: User; story: Story | null })[]>;
  updateReportStatus(id: number, status: 'resolved' | 'dismissed'): Promise<Report>;
  getAdminStats(): Promise<AdminStats>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
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
  } = {}): Promise<(Story & { author: User; category: Category | null })[]> {
    let query: any = db.select().from(stories);

    const conditions = [];
    if (filters.categoryId) {
      conditions.push(eq(stories.categoryId, filters.categoryId));
    }
    if (filters.search) {
      conditions.push(ilike(stories.title, `%${filters.search}%`));
    }

    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    if (filters.sort === 'trending') {
      query = query.orderBy(desc(stories.likesCount), desc(stories.commentsCount));
    } else if (filters.sort === 'highlight') {
      query = query.orderBy(desc(stories.isHighlight), desc(stories.createdAt));
    } else {
      query = query.orderBy(desc(stories.createdAt));
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const rawStories = await query;
    const allUsers = await this.getAllUsers();
    const allCategories = await this.getCategories();

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

    return rawStories.map((story: any) => {
      const author = userMap.get(Number((story as any).authorId));
      return {
        ...(story as any),
        author: author ?? allUsers[0],
        category: story.categoryId ? categoryMap.get(story.categoryId) ?? null : null,
      };
    });
  }

  async getStory(id: number): Promise<(Story & { author: User; category: Category | null }) | undefined> {
    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    if (!story) return undefined;

    const author = await this.getUser(Number((story as any).authorId));
    if (!author) return undefined;

    const category = story.categoryId ? (await db.select().from(categories).where(eq(categories.id, story.categoryId)))[0] ?? null : null;
    return { ...(story as any), author, category };
  }

  async createStory(story: { title: string; content: string; authorId: number; categoryId?: number; isAnonymous?: boolean }): Promise<Story> {
    const [newStory] = await db.insert(stories).values({
      ...story,
      authorId: String(story.authorId) as any,
    }).returning();
    return newStory;
  }

  async deleteStory(id: number): Promise<void> {
    await db.delete(stories).where(eq(stories.id, id));
  }

  async getComments(storyId: number): Promise<(Comment & { author: User })[]> {
    const rows = await db.select().from(comments).where(eq(comments.storyId, storyId)).orderBy(desc(comments.createdAt));
    const allUsers = await this.getAllUsers();
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    return rows
      .map((comment) => {
        const author = userMap.get(Number((comment as any).authorId));
        if (!author) return null;
        return { ...(comment as any), author };
      })
      .filter((x): x is (Comment & { author: User }) => x !== null);
  }

  async createComment(comment: { content: string; authorId: number; storyId: number }): Promise<Comment> {
    const [newComment] = await db.insert(comments).values({
      ...comment,
      authorId: String(comment.authorId) as any,
    }).returning();
    
    // Increment comment count
    await db.update(stories)
      .set({ commentsCount: sql`${stories.commentsCount} + 1` })
      .where(eq(stories.id, comment.storyId));

    return newComment;
  }

  async getLike(userId: number, storyId: number): Promise<Like | undefined> {
    const [like] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, String(userId) as any), eq(likes.storyId, storyId)));
    return like;
  }

  async toggleLike(userId: number, storyId: number): Promise<{ liked: boolean; likesCount: number }> {
    const existingLike = await this.getLike(userId, storyId);
    let liked = false;

    if (existingLike) {
      await db.delete(likes).where(eq(likes.id, existingLike.id));
      await db.update(stories)
        .set({ likesCount: sql`${stories.likesCount} - 1` })
        .where(eq(stories.id, storyId));
    } else {
      await db.insert(likes).values({ userId: String(userId) as any, storyId });
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

  async createReport(report: { reporterId: number; storyId?: number; commentId?: number; reason: string }): Promise<Report> {
    const [newReport] = await db.insert(reports).values({
      ...report,
      reporterId: String(report.reporterId) as any,
    }).returning();
    return newReport;
  }

  async getReports(): Promise<(Report & { reporter: User; story: Story | null })[]> {
    const allReports = await db.select().from(reports);
    const allUsers = await this.getAllUsers();
    const allStories = await db.select().from(stories);

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const storyMap = new Map(allStories.map((s) => [s.id, s]));

    return allReports
      .map((report) => {
        const reporter = userMap.get(Number((report as any).reporterId));
        if (!reporter) return null;
        return {
          ...(report as any),
          reporter,
          story: report.storyId ? storyMap.get(report.storyId) ?? null : null,
        };
      })
      .filter((x): x is (Report & { reporter: User; story: Story | null }) => x !== null);
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
