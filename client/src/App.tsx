import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/use-auth";

import Home from "@/pages/Home";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/AuthPage";
import StoryDetail from "@/pages/StoryDetail";
import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/AdminDashboard";
import NotFound from "@/pages/not-found";

function PrivateRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) return null;

  if (!user) {
    const nextPath = adminOnly ? "/admin" : window.location.pathname;
    setLocation(`/auth?next=${encodeURIComponent(nextPath)}`);
    return null;
  }

  if (adminOnly && user.role !== 'admin') {
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

        <Route path="/auth" component={AuthPage} />
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
