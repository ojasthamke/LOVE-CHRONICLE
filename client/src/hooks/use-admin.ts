import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useAdminStats() {
  return useQuery({
    queryKey: [api.admin.stats.path],
    queryFn: async () => {
      const res = await fetch(api.admin.stats.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.admin.stats.responses[200].parse(await res.json());
    },
  });
}

export function useReports() {
  return useQuery({
    queryKey: [api.admin.reports.list.path],
    queryFn: async () => {
      const res = await fetch(api.admin.reports.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reports");
      return api.admin.reports.list.responses[200].parse(await res.json());
    },
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number, status: 'resolved' | 'dismissed' }) => {
      const url = buildUrl(api.admin.reports.resolve.path, { id });
      const res = await fetch(url, {
        method: api.admin.reports.resolve.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to resolve report");
      return api.admin.reports.resolve.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.reports.list.path] });
      toast({ title: "Success", description: "Report status updated." });
    },
  });
}
