import { useState } from "react";
import { useStories } from "@/hooks/use-stories";
import { useCategories } from "@/hooks/use-categories";
import { StoryCard } from "@/components/StoryCard";
import { CreateStoryModal } from "@/components/CreateStoryModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [sort, setSort] = useState<'latest' | 'trending' | 'highlight'>('latest');
  const [activeCategory, setActiveCategory] = useState<number | undefined>();
  
  const { data: stories, isLoading } = useStories({ 
    sort, 
    categoryId: activeCategory 
  });
  
  const { data: categories } = useCategories();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar - Categories */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            <div className="bg-card rounded-2xl p-6 border border-border/50 sticky top-24 shadow-sm">
              <h3 className="font-display font-bold text-lg mb-4">Discover</h3>
              <div className="flex flex-col gap-2">
                <Button
                  variant={activeCategory === undefined ? "secondary" : "ghost"}
                  className="justify-start font-medium"
                  onClick={() => setActiveCategory(undefined)}
                >
                  All Stories
                </Button>
                {categories?.map(cat => (
                  <Button
                    key={cat.id}
                    variant={activeCategory === cat.id ? "secondary" : "ghost"}
                    className="justify-start font-medium"
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-6 space-y-6">
            {/* Mobile Category Scroll */}
            <div className="lg:hidden overflow-x-auto pb-2 -mx-4 px-4 flex gap-2 scrollbar-hide">
              <Button
                variant={activeCategory === undefined ? "secondary" : "outline"}
                size="sm"
                className="rounded-full whitespace-nowrap"
                onClick={() => setActiveCategory(undefined)}
              >
                All
              </Button>
              {categories?.map(cat => (
                <Button
                  key={cat.id}
                  variant={activeCategory === cat.id ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-full whitespace-nowrap"
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>

            {/* Sort Tabs */}
            <div className="flex items-center justify-between">
              <Tabs value={sort} onValueChange={(v) => setSort(v as any)} className="w-full">
                <TabsList className="bg-transparent p-0 gap-6 h-auto">
                  <TabsTrigger 
                    value="latest"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 transition-all font-semibold"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Latest
                  </TabsTrigger>
                  <TabsTrigger 
                    value="trending"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 transition-all font-semibold"
                  >
                    <Flame className="w-4 h-4 mr-2" />
                    Trending
                  </TabsTrigger>
                  <TabsTrigger 
                    value="highlight"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 transition-all font-semibold"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Highlights
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Stories List */}
            <div className="space-y-6">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-6 rounded-2xl border border-border/50 space-y-4">
                    <div className="flex gap-4">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="w-32 h-4" />
                        <Skeleton className="w-24 h-3" />
                      </div>
                    </div>
                    <Skeleton className="w-3/4 h-6" />
                    <Skeleton className="w-full h-24" />
                  </div>
                ))
              ) : stories?.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-2xl border border-border/50">
                  <h3 className="text-xl font-bold mb-2">No stories yet</h3>
                  <p className="text-muted-foreground mb-6">Be the first to share your story in this category.</p>
                  <div className="inline-block">
                    <CreateStoryModal />
                  </div>
                </div>
              ) : (
                stories?.map(story => (
                  <StoryCard key={story.id} story={story} />
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar - Trending/Premium */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            <div className="bg-gradient-to-br from-indigo-900 to-violet-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
              <h3 className="font-display font-bold text-lg mb-2 relative z-10">Premium Membership</h3>
              <p className="text-indigo-100 text-sm mb-4 relative z-10">Unlock highlight stories and exclusive badges.</p>
              <Button variant="secondary" className="w-full font-semibold relative z-10">
                Upgrade Now
              </Button>
            </div>
            
            <div className="bg-card rounded-2xl p-6 border border-border/50">
              <h3 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-wider mb-4">Community Rules</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2">
                  <span className="text-primary">•</span> Be kind and respectful
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span> No hate speech or bullying
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span> Respect privacy
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
      
      {/* Mobile FAB */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <CreateStoryModal />
      </div>
    </div>
  );
}
