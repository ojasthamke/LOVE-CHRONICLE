import { useRoute } from "wouter";
import { useStory } from "@/hooks/use-stories";
import { useComments, useCreateComment } from "@/hooks/use-comments";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCommentSchema, type InsertComment } from "@shared/schema";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { StoryCard } from "@/components/StoryCard";

export default function StoryDetail() {
  const [, params] = useRoute("/story/:id");
  const id = parseInt(params?.id || "0");
  const { user } = useAuth();
  
  const { data: story, isLoading: storyLoading } = useStory(id);
  const { data: comments, isLoading: commentsLoading } = useComments(id);
  const createComment = useCreateComment(id);

  const form = useForm<Omit<InsertComment, "storyId">>({
    resolver: zodResolver(insertCommentSchema.omit({ storyId: true })),
    defaultValues: { content: "" },
  });

  const onSubmit = (data: { content: string }) => {
    createComment.mutate(data, {
      onSuccess: () => form.reset(),
    });
  };

  if (storyLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Skeleton className="w-full h-64 rounded-2xl mb-8" />
        <Skeleton className="w-3/4 h-8 mb-4" />
        <Skeleton className="w-full h-4 mb-2" />
        <Skeleton className="w-full h-4 mb-2" />
        <Skeleton className="w-2/3 h-4" />
      </div>
    );
  }

  if (!story) return <div className="text-center py-20">Story not found</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Feed
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              const url = `https://wa.me/?text=${encodeURIComponent(story.title + " " + window.location.href)}`;
              window.open(url, '_blank');
            }}>
              Share to WhatsApp
            </Button>
          </div>
        </div>

        {/* Story Content */}
        <div className="mb-10">
          <StoryCard story={story} />
        </div>

        {/* Comments Section */}
        <div className="space-y-8">
          <div className="flex items-center gap-2 mb-6">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-xl">
              Comments ({comments?.length || 0})
            </h3>
          </div>

          {/* Comment Form */}
          {user ? (
            <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
              <div className="flex gap-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback>{user.username?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="Share your thoughts..." 
                                className="min-h-[100px] resize-none bg-background" 
                                {...field} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end">
                        <Button type="submit" disabled={createComment.isPending}>
                          {createComment.isPending ? "Posting..." : "Post Comment"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 p-6 rounded-2xl text-center">
              <p className="text-muted-foreground mb-4">Log in to join the conversation</p>
              <Button asChild>
                <a href="/api/login">Log In</a>
              </Button>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-6">
            {comments?.map((comment) => (
              <div key={comment.id} className="flex gap-4 animate-in fade-in duration-500">
                <Avatar className="w-10 h-10 border border-border">
                  <AvatarImage src={comment.author.profileImageUrl || undefined} />
                  <AvatarFallback>{comment.author.username?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{comment.author.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed bg-card p-4 rounded-r-2xl rounded-bl-2xl border border-border/40 shadow-sm">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
