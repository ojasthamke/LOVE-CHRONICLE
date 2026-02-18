import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, User, Settings, LogOut, Shield, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateStoryModal } from "./CreateStoryModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  // Don't show nav on landing page if not logged in
  if (!user && location === "/") return null;

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold font-display text-xl">
              S
            </div>
            <span className="font-display font-bold text-xl tracking-tight hidden sm:inline-block">
              SoulShare
            </span>
          </div>
        </Link>

        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search stories..." 
              className="w-full bg-muted/50 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {user ? (
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/">
              <a className={cn(
                "p-2 rounded-full transition-colors",
                location === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}>
                <Home className="w-5 h-5" />
              </a>
            </Link>

            <div className="hidden sm:block">
              <CreateStoryModal />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <Avatar className="h-9 w-9 border-2 border-background shadow-sm cursor-pointer hover:scale-105 transition-transform">
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {user.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-semibold">
                  {user.username}
                </div>
                <DropdownMenuSeparator />
                <Link href={`/profile/${user.id}`}>
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                </Link>
                {/* Simple check for admin based on username for demo purposes, rarely do this in prod but fine here */}
                {user.email?.includes('admin') && (
                  <Link href="/admin">
                    <DropdownMenuItem className="cursor-pointer">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  </Link>
                )}
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => logout()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <a href="/api/login" className="text-sm font-medium hover:text-primary transition-colors">
              Log in
            </a>
            <a href="/api/login" className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
              Get Started
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
