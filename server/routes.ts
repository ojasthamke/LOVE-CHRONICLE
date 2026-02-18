import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  setupAuth(app);

  // --- STORIES ---
  app.get(api.stories.list.path, async (req, res) => {
    try {
      const filters = {
        categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
        search: req.query.search as string,
        sort: req.query.sort as "latest" | "trending" | "highlight",
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };
      const stories = await storage.getStories(filters);
      res.json(stories);
    } catch (err) {
      console.error("GET Stories Error:", err);
      res.json([]);
    }
  });

  app.get(api.stories.get.path, async (req, res) => {
    try {
      const story = await storage.getStory(Number(req.params.id));
      if (!story) return res.status(404).json({ message: "Story not found" });
      res.json(story);
    } catch (err) {
      console.error("GET Story Error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.stories.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.stories.create.input.parse(req.body);
      const story = await storage.createStory({
        ...input,
        categoryId: input.categoryId ?? undefined,
        authorId: req.user!.id,
      });
      res.status(201).json(story);
    } catch (err) {
      console.error("POST Story Create Error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to upload story. Please check database connection." });
    }
  });

  app.post(api.stories.toggleLike.path, requireAuth, async (req, res) => {
    try {
      const storyId = Number(req.params.id);
      const story = await storage.getStory(storyId);
      if (!story) return res.status(404).json({ message: "Story not found" });

      const result = await storage.toggleLike(req.user!.id, storyId);
      res.json(result);
    } catch (err) {
      console.error("POST Like Toggle Error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.stories.delete.path, requireAuth, async (req, res) => {
    try {
      const story = await storage.getStory(Number(req.params.id));
      if (!story) return res.status(404).json({ message: "Story not found" });

      const isAdmin = req.user!.role === "admin";
      if (story.authorId !== req.user!.id && !isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteStory(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      console.error("DELETE Story Error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- COMMENTS ---
  app.get(api.comments.list.path, async (req, res) => {
    try {
      const comments = await storage.getComments(Number(req.params.storyId));
      res.json(comments);
    } catch {
      res.json([]);
    }
  });

  app.post(api.comments.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.comments.create.input.parse(req.body);
      const comment = await storage.createComment({
        ...input,
        storyId: Number(req.params.storyId),
        authorId: req.user!.id,
      });
      res.status(201).json(comment);
    } catch (err) {
      console.error("POST Comment Create Error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: err.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- CATEGORIES ---
  app.get(api.categories.list.path, async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (err) {
      console.error("GET Categories Error:", err);
      res.json([]);
    }
  });

  app.post(api.categories.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.categories.create.input.parse(req.body);
      const category = await storage.createCategory(input);
      res.status(201).json(category);
    } catch (err) {
      console.error("POST Category Error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: err.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- USERS ---
  app.get(api.users.me.path, requireAuth, async (req, res) => {
    res.json(req.user);
  });

  app.patch(api.users.update.path, requireAuth, async (req, res) => {
    try {
      const input = api.users.update.input.parse(req.body);
      const safeUpdate = {
        username: input.username,
        bio: input.bio,
      };

      const updated = await storage.updateUser(req.user!.id, safeUpdate);
      res.json(updated);
    } catch (err) {
      console.error("PATCH User Error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: err.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.users.get.path, async (req, res) => {
    try {
      const user = await storage.getUser(Number(req.params.id));
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ ...user, stories: [] });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // --- REPORTS ---
  app.post("/api/reports", requireAuth, async (req, res) => {
    try {
      const input = api.admin.reports.resolve.input.partial().extend({
        storyId: z.number().optional(),
        commentId: z.number().optional(),
        reason: z.string().min(3),
      }).parse(req.body);

      const report = await storage.createReport({
        reporterId: req.user!.id,
        storyId: input.storyId,
        commentId: input.commentId,
        reason: input.reason,
      });
      res.status(201).json(report);
    } catch (err) {
      console.error("POST Report Error:", err);
      res.status(400).json({ message: "Invalid report payload" });
    }
  });

  // --- ADMIN ---
  app.get(api.admin.stats.path, requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (err) {
      console.error("GET Admin Stats Error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.admin.reports.list.path, requireAdmin, async (_req, res) => {
    try {
      const reports = await storage.getReports();
      res.json(reports);
    } catch (err) {
      console.error("GET Reports Error:", err);
      res.status(500).json([]);
    }
  });

  app.patch(api.admin.reports.resolve.path, requireAdmin, async (req, res) => {
    try {
      const input = api.admin.reports.resolve.input.parse(req.body);
      const reportId = Number(req.params.id);
      const updated = await storage.updateReportStatus(reportId, input.status);
      res.json(updated);
    } catch (err) {
      console.error("PATCH Resolve Report Error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: err.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  try {
    const categories = await storage.getCategories();
    if (categories.length === 0) {
      await storage.createCategory({ name: "Love", slug: "love", description: "Romantic relationships" });
      await storage.createCategory({ name: "Family", slug: "family", description: "Family matters" });
      await storage.createCategory({ name: "Friendship", slug: "friendship", description: "Friends and social life" });
      await storage.createCategory({ name: "Breakup", slug: "breakup", description: "Moving on" });
      await storage.createCategory({ name: "Marriage", slug: "marriage", description: "Married life" });
    }

    const users = await storage.getAllUsers();
    if (users.length > 0) {
      const first = users[0];
      if (first.role !== "admin") {
        await storage.updateUser(first.id, { role: "admin" });
      }

      const freshCategories = await storage.getCategories();
      const bySlug = new Map(freshCategories.map((c) => [c.slug, c.id]));

      const seedStories = [
        {
          title: "When Rain Met Rooftop Promises",
          categorySlug: "love",
          content:
            "English: We were broke, sharing one umbrella and two impossible dreams. That monsoon night, she laughed and said, ‘Let’s build a home where fear never gets rent.’\n\nHindi: Us raat baarish sirf aasman se nahi, humare dilon se bhi ho rahi thi. Usne mera haath pakad ke kaha, ‘Paise kam hain, par hausla full hai.’\n\nHinglish: Life ne EMI bheja, humne memes bhej diye. Abhi bhi jab baarish hoti hai, hum dono chai ke saath future ki planning karte hain — thoda pagal, thoda magical.",
        },
        {
          title: "Maa Ka Chhota Message, Bada Sahara",
          categorySlug: "family",
          content:
            "English: I failed an interview and sat outside pretending to be okay. Mom texted: ‘Beta, result nahi, insaan bada banta hai.’ I cried in the parking lot and felt stronger.\n\nHindi: Maa ka ek message kabhi kabhi poori therapy se heavy hota hai. Unhone sirf likha, ‘Ghar aa ja, garam roti ready hai.’\n\nHinglish: Startup failed? Theek. Confidence down? Thoda. But ghar ka wifi + maa ka pyaar = instant reboot.",
        },
        {
          title: "3 AM Dost, 24x7 Dil",
          categorySlug: "friendship",
          content:
            "English: True friendship is when someone answers your 3 AM ‘bro, I messed up’ call and starts with ‘location bhej’.\n\nHindi: Dosti voh hai jahan explanation kam, presence zyada hoti hai. Galti pe daant bhi milti hai, par saath kabhi nahi chhodte.\n\nHinglish: Hum perfect nahi hain, par squad solid hai. Ek ke breakup pe sab ka playlist sad ho jata hai.",
        },
        {
          title: "After Goodbye, I Found My Name Again",
          categorySlug: "breakup",
          content:
            "English: The breakup didn’t break me — it introduced me to myself. I relearned silence, solo coffee dates, and self-respect.\n\nHindi: Judaai ne dard diya, par pehchaan bhi di. Maine khud se dosti karna seekha.\n\nHinglish: Pehle ‘we’ tha, phir ‘why’ hua, ab ‘I’ hoon — aur honestly, I like this version better.",
        },
        {
          title: "Shaadi: Teamwork in Festival Mode",
          categorySlug: "marriage",
          content:
            "English: Marriage isn’t a fairytale; it’s two humans doing updates, patches, and apologies in real-time.\n\nHindi: Shaadi mein jeet tab hoti hai jab ‘main sahi’ se pehle ‘hum saath’ yaad aata hai.\n\nHinglish: Calendar full, bills high, jokes terrible — but night ki chai pe jab dono haste hain, lagta hai life still premium plan pe hai.",
        },
      ];

      for (const seed of seedStories) {
        const existing = await storage.getStories({ search: seed.title, limit: 5 });
        const alreadyPresent = existing.some((s) => s.title.toLowerCase() === seed.title.toLowerCase());
        if (alreadyPresent) continue;

        const categoryId = bySlug.get(seed.categorySlug);
        await storage.createStory({
          title: seed.title,
          content: seed.content,
          authorId: first.id,
          categoryId,
          isAnonymous: false,
        });
      }
    }
  } catch (err) {
    console.error("Database seeding failed:", err);
  }
}
