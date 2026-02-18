import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Heart, Share2, MoreHorizontal } from "lucide-react";
import { Story, User, Category } from "@shared/schema";
import { useToggleLike } from "@/hooks/use-stories";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface StoryCardProps {
  story: Story & { author: User; category: Category | null };
}

export function StoryCard({ story }: StoryCardProps) {
  const { user } = useAuth();
  const toggleLike = useToggleLike();
  
  const isOwner = user?.id === story.authorId;
  const isHighlight = story.isHighlight;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: story.title,
        text: story.content.substring(0, 100) + '...',
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Fallback
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className={cn(
      "story-card p-6 flex flex-col gap-4",
      isHighlight && "highlight-gradient"
    )}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-secondary overflow-hidden flex-shrink-0">
            {story.isAnonymous ? (
              <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-xs font-bold text-muted-foreground">
                ?
              </div>
            ) : (
              <img 
                src={story.author.profileImageUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${story.author.username}`} 
                alt={story.author.username || "User"} 
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {story.isAnonymous ? "Anonymous" : story.author.username}
              </span>
              {story.category && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium uppercase tracking-wider">
                  {story.category.name}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                Delete Story
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Link href={`/story/${story.id}`}>
        <div className="cursor-pointer group">
          <h3 className="text-xl font-bold font-display mb-2 group-hover:text-primary transition-colors">
            {story.title}
          </h3>
          <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
            {story.content}
          </p>
        </div>
      </Link>

      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => toggleLike.mutate(story.id)}
            disabled={toggleLike.isPending}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition-colors group"
          >
            <Heart className={cn("w-5 h-5 transition-transform group-active:scale-90", story.likesCount > 0 && "fill-accent stroke-accent")} />
            <span>{story.likesCount}</span>
          </button>
          
          <Link href={`/story/${story.id}`}>
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <MessageCircle className="w-5 h-5" />
              <span>{story.commentsCount}</span>
            </button>
          </Link>
        </div>

        <button 
          onClick={handleShare}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
