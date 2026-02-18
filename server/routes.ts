import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // --- STORIES ---
  app.get(api.stories.list.path, async (req, res) => {
    const filters = {
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
      search: req.query.search as string,
      sort: req.query.sort as 'latest' | 'trending' | 'highlight',
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    const stories = await storage.getStories(filters);
    res.json(stories);
  });

  app.get(api.stories.get.path, async (req, res) => {
    const story = await storage.getStory(Number(req.params.id));
    if (!story) return res.status(404).json({ message: "Story not found" });
    res.json(story);
  });

  app.post(api.stories.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.stories.create.input.parse(req.body);
      const story = await storage.createStory({
        ...input,
        authorId: (req.user as any).claims.sub, // Replit Auth ID
      });
      res.status(201).json(story);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.stories.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(403).json({ message: "Unauthorized" });
    
    const story = await storage.getStory(Number(req.params.id));
    if (!story) return res.status(404).json({ message: "Story not found" });

    const userId = (req.user as any).claims.sub;
    // Check if author or admin
    // We need to fetch user role to check admin
    const user = await storage.getUser(userId);
    const isAdmin = user?.role === 'admin';

    if (story.authorId !== userId && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await storage.deleteStory(Number(req.params.id));
    res.status(204).send();
  });

  app.post(api.stories.toggleLike.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const result = await storage.toggleLike((req.user as any).claims.sub, Number(req.params.id));
    res.json(result);
  });

  // --- COMMENTS ---
  app.get(api.comments.list.path, async (req, res) => {
    const comments = await storage.getComments(Number(req.params.storyId));
    res.json(comments);
  });

  app.post(api.comments.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.comments.create.input.parse(req.body);
      const comment = await storage.createComment({
        ...input,
        storyId: Number(req.params.storyId),
        authorId: (req.user as any).claims.sub,
      });
      res.status(201).json(comment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // --- CATEGORIES ---
  app.get(api.categories.list.path, async (req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.post(api.categories.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(403).json({ message: "Unauthorized" });
    const userId = (req.user as any).claims.sub;
    const user = await storage.getUser(userId);
    if (user?.role !== 'admin') return res.status(403).json({ message: "Forbidden" });

    try {
      const input = api.categories.create.input.parse(req.body);
      const category = await storage.createCategory(input);
      res.status(201).json(category);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // --- USERS ---
  app.patch(api.users.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.users.update.input.parse(req.body);
      const user = await storage.updateUser((req.user as any).claims.sub, input);
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.users.get.path, async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    // TODO: fetch stories for user
    // For now, let's just return user
    res.json({ ...user, stories: [] });
  });

  // --- ADMIN ---
  app.get(api.admin.stats.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(403).json({ message: "Unauthorized" });
    const user = await storage.getUser((req.user as any).claims.sub);
    if (user?.role !== 'admin') return res.status(403).json({ message: "Forbidden" });

    const stats = await storage.getAdminStats();
    res.json(stats);
  });

  app.get(api.admin.reports.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(403).json({ message: "Unauthorized" });
    const user = await storage.getUser((req.user as any).claims.sub);
    if (user?.role !== 'admin') return res.status(403).json({ message: "Forbidden" });

    const reports = await storage.getReports();
    res.json(reports);
  });

  app.patch(api.admin.reports.resolve.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(403).json({ message: "Unauthorized" });
    const user = await storage.getUser((req.user as any).claims.sub);
    if (user?.role !== 'admin') return res.status(403).json({ message: "Forbidden" });

    const input = api.admin.reports.resolve.input.parse(req.body);
    const report = await storage.updateReportStatus(Number(req.params.id), input.status);
    res.json(report);
  });

  // Seeding
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const categories = await storage.getCategories();
  if (categories.length === 0) {
    await storage.createCategory({ name: "Love", slug: "love", description: "Romantic relationships" });
    await storage.createCategory({ name: "Family", slug: "family", description: "Family matters" });
    await storage.createCategory({ name: "Friendship", slug: "friendship", description: "Friends and social life" });
    await storage.createCategory({ name: "Breakup", slug: "breakup", description: "Moving on" });
    await storage.createCategory({ name: "Marriage", slug: "marriage", description: "Married life" });
  }
}
