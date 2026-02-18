import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/use-auth";

import Home from "@/pages/Home";
import Landing from "@/pages/Landing";
import StoryDetail from "@/pages/StoryDetail";
import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/AdminDashboard";
import NotFound from "@/pages/not-found";

function PrivateRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) return null;

  if (!user) {
    // Redirect logic handled mostly by auth hooks/utils but explicit here for safety
    window.location.href = "/api/login";
    return null;
  }

  // Simple admin check for demo purposes
  if (adminOnly && !user.email?.includes('admin')) {
    setLocation("/");
    return null;
  }

  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <>
      <Navigation />
      <Switch>
        {/* If logged in, / goes to Home, else Landing */}
        <Route path="/">
          {user ? <Home /> : <Landing />}
        </Route>

        <Route path="/story/:id" component={StoryDetail} />
        
        <Route path="/profile/:id">
          <PrivateRoute component={Profile} />
        </Route>

        <Route path="/admin">
          <PrivateRoute component={AdminDashboard} adminOnly />
        </Route>

        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
