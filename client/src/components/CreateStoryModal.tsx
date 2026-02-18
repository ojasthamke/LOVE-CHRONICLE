import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStorySchema, type InsertStory } from "@shared/schema";
import { useCreateStory } from "@/hooks/use-stories";
import { useCategories } from "@/hooks/use-categories";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PenSquare } from "lucide-react";

export function CreateStoryModal() {
  const [open, setOpen] = useState(false);
  const createStory = useCreateStory();
  const { data: categories } = useCategories();

  const form = useForm<InsertStory>({
    resolver: zodResolver(insertStorySchema),
    defaultValues: {
      title: "",
      content: "",
      isAnonymous: false,
      isHighlight: false,
    },
  });

  const onSubmit = (data: InsertStory) => {
    createStory.mutate(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-indigo-600 hover:shadow-xl hover:scale-105 transition-all duration-300">
          <PenSquare className="w-4 h-4 mr-2" />
          Write Story
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Share your story</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Give your story a memorable title..." className="text-lg font-medium" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(parseInt(val))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Story</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Pour your heart out..." 
                      className="min-h-[200px] resize-none leading-relaxed" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Post Anonymously</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Hide your identity for this story
                </div>
              </div>
              <FormField
                control={form.control}
                name="isAnonymous"
                render={({ field }) => (
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                )}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-lg" 
              disabled={createStory.isPending}
            >
              {createStory.isPending ? "Publishing..." : "Publish Story"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
