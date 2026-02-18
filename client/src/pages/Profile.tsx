import { useRoute } from "wouter";
import { useUser, useUpdateProfile } from "@/hooks/use-users";
import { useStories } from "@/hooks/use-stories";
import { StoryCard } from "@/components/StoryCard";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Settings, Award } from "lucide-react";
import { useState } from "react";

export default function Profile() {
  const [, params] = useRoute("/profile/:id");
  const { user: currentUser } = useAuth();
  
  // If no ID param, try to use current user's ID, but only if they are logged in
  const profileId = params?.id || currentUser?.id;

  const { data: user, isLoading: userLoading } = useUser(profileId as string);
  const updateProfile = useUpdateProfile();
  
  const isOwnProfile = currentUser?.id === user?.id;
  const [editOpen, setEditOpen] = useState(false);

  if (userLoading) return <div className="p-8"><Skeleton className="w-full h-48" /></div>;
  if (!user) return <div className="p-8 text-center">User not found</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary/5 border-b border-border/50">
        <div className="container mx-auto px-4 py-12 flex flex-col items-center text-center">
          <Avatar className="w-24 h-24 mb-4 ring-4 ring-background shadow-xl">
            <AvatarImage src={user.profileImageUrl || undefined} />
            <AvatarFallback className="text-2xl">{user.username?.[0]}</AvatarFallback>
          </Avatar>
          
          <div className="flex items-center gap-2 mb-2">
            <h1 className="font-display font-bold text-3xl">{user.username}</h1>
            {/* Premium Badge (Mock) */}
            <span className="bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3 h-3" /> Premium
            </span>
          </div>
          
          <p className="text-muted-foreground max-w-md mb-6">
            {user.bio || "Sharing stories, connecting souls."}
          </p>

          <div className="flex gap-8 mb-8">
            <div className="text-center">
              <div className="font-bold text-xl">{user.stories?.length || 0}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Stories</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-xl">124</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Following</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-xl">8.5k</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Likes</div>
            </div>
          </div>

          {isOwnProfile && (
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings className="w-4 h-4" /> Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <form 
                  className="space-y-4 mt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    updateProfile.mutate({ 
                      username: formData.get('username') as string,
                      // bio: formData.get('bio') as string 
                    }, {
                      onSuccess: () => setEditOpen(false)
                    });
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" name="username" defaultValue={user.username} />
                  </div>
                  {/* Bio would go here if schema supported it */}
                  <Button type="submit" className="w-full" disabled={updateProfile.isPending}>
                    Save Changes
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h2 className="font-display font-bold text-2xl mb-6">Stories</h2>
        <div className="space-y-6">
          {user.stories?.map((story) => (
             // Need to cast or fetch full story objects. For this list, we might need a separate hook 
             // or just map what we have if the get-user endpoint returns minimal story data.
             // Assuming the endpoint returns enough for the card or we fetch full list filtered by author.
             // For now, let's render a simplified card or assume the data structure matches.
             // Actually, the route GET /api/users/:id returns { stories: [...] }
             // We need to inject the author object back into it for StoryCard to work perfectly
            <StoryCard 
              key={story.id} 
              story={{ ...story, author: user, category: null }} 
            />
          ))}
          {(!user.stories || user.stories.length === 0) && (
            <div className="text-center text-muted-foreground py-10">
              No stories shared yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
