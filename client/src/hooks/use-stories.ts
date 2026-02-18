import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertStory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useStories(params?: { categoryId?: number; sort?: 'latest' | 'trending' | 'highlight' }) {
  const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
  
  return useQuery({
    queryKey: [api.stories.list.path, params],
    queryFn: async () => {
      const res = await fetch(api.stories.list.path + queryString, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stories");
      return api.stories.list.responses[200].parse(await res.json());
    },
  });
}

export function useStory(id: number) {
  return useQuery({
    queryKey: [api.stories.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.stories.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch story");
      return api.stories.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertStory) => {
      const res = await fetch(api.stories.create.path, {
        method: api.stories.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create story");
      }
      return api.stories.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.stories.list.path] });
      toast({ title: "Posted!", description: "Your story has been shared." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.stories.delete.path, { id });
      const res = await fetch(url, { 
        method: api.stories.delete.method, 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete story");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.stories.list.path] });
      toast({ title: "Deleted", description: "Story removed successfully." });
    },
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.stories.toggleLike.path, { id });
      const res = await fetch(url, { 
        method: api.stories.toggleLike.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to like story");
      return api.stories.toggleLike.responses[200].parse(await res.json());
    },
    onSuccess: (data, id) => {
      // Optimistic update or simple invalidation
      queryClient.invalidateQueries({ queryKey: [api.stories.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stories.get.path, id] });
    },
  });
}
