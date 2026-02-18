import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-3xl opacity-40" />
      </div>

      <nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold font-display text-xl">
            S
          </div>
          <span className="font-display font-bold text-xl tracking-tight">
            SoulShare
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/api/login">
            <Button variant="ghost" className="font-semibold">Log in</Button>
          </a>
          <a href="/api/login">
            <Button className="font-semibold shadow-lg shadow-primary/25">Sign up</Button>
          </a>
        </div>
      </nav>

      <main className="relative z-10 container mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl space-y-8"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm">
            Join 10,000+ storytellers
          </span>
          
          <h1 className="font-display font-bold text-5xl md:text-7xl tracking-tight leading-tight">
            Share your story.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">
              Connect with souls.
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            A safe space to share your experiences, thoughts, and dreams anonymously or as yourself. Find your community in the stories we share.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a href="/api/login">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:scale-105">
                Start Reading
              </Button>
            </a>
            <a href="/api/login">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-secondary/50">
                Write a Story
              </Button>
            </a>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mt-32 w-full max-w-6xl">
          {[
            { title: "Anonymous Posting", desc: "Share your deepest thoughts without revealing your identity.", icon: "?" },
            { title: "Supportive Community", desc: "Connect with people who resonate with your experiences.", icon: "♥" },
            { title: "Highlight Stories", desc: "Get your best stories featured and seen by everyone.", icon: "★" },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + (i * 0.2) }}
              className="bg-white/50 backdrop-blur-sm p-8 rounded-3xl border border-white/20 shadow-xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mb-6">
                {feature.icon}
              </div>
              <h3 className="font-display font-bold text-xl mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/50 bg-white/50 backdrop-blur-sm py-12">
        <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
          © 2024 SoulShare. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
