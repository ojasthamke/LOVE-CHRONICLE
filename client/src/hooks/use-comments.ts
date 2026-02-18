import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertComment } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useComments(storyId: number) {
  return useQuery({
    queryKey: [api.comments.list.path, storyId],
    queryFn: async () => {
      const url = buildUrl(api.comments.list.path, { storyId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch comments");
      return api.comments.list.responses[200].parse(await res.json());
    },
    enabled: !!storyId,
  });
}

export function useCreateComment(storyId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<InsertComment, "storyId">) => {
      const url = buildUrl(api.comments.create.path, { storyId });
      const res = await fetch(url, {
        method: api.comments.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to post comment");
      return api.comments.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.comments.list.path, storyId] });
      queryClient.invalidateQueries({ queryKey: [api.stories.list.path] }); // Update comment counts
      queryClient.invalidateQueries({ queryKey: [api.stories.get.path, storyId] });
      toast({ title: "Commented", description: "Your thought has been added." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post comment", variant: "destructive" });
    },
  });
}
