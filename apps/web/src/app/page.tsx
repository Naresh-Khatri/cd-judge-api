"use client";

import { redirect } from "next/navigation";
import { Clock, Code2, Github, Shield, Zap } from "lucide-react";

import { GitHubStarsButton } from "~/components/github-button";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { authClient } from "~/lib/auth/client";

export default function HomePage() {
  const { data: session } = authClient.useSession();

  // If already logged in, redirect to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="from-background to-muted/20 flex min-h-screen flex-col items-center justify-center bg-gradient-to-b">
      <div className="container flex max-w-4xl flex-col items-center gap-12 px-4 py-16">
        {/* Hero Section */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-primary shadow-primary/20 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg">
            <Zap
              className="fill-primary-foreground text-primary-foreground"
              size={32}
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            cd judge
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg sm:text-xl">
            A free and open-source code execution engine. Run code securely
            across 10 programming languages with 10x Judge0 limits.
          </p>
        </div>

        {/* Features */}
        <div className="grid w-full gap-4 sm:grid-cols-3">
          <Card className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              <Code2 className="text-primary" size={24} />
            </div>
            <h3 className="font-semibold">10 Languages</h3>
            <p className="text-muted-foreground text-sm">
              Python, Node.js, TypeScript, Java, C++, C, Rust, Go, Ruby, and
              PHP
            </p>
          </Card>
          <Card className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              <Shield className="text-primary" size={24} />
            </div>
            <h3 className="font-semibold">Secure Sandbox</h3>
            <p className="text-muted-foreground text-sm">
              Isolated execution via Linux isolate with cgroup v2
            </p>
          </Card>
          <Card className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              <Clock className="text-primary" size={24} />
            </div>
            <h3 className="font-semibold">Fast</h3>
            <p className="text-muted-foreground text-sm">
              p95 latency under 500ms with real-time results
            </p>
          </Card>
        </div>

        {/* Quick Start */}
        <Card className="w-full p-6">
          <h3 className="mb-3 text-center text-lg font-semibold">
            Quick Start
          </h3>
          <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
            <code>{`curl -X POST https://cdjudge.com/api/v1/submissions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"lang": "py", "code": "print(42)"}'`}</code>
          </pre>
        </Card>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-3">
            <GitHubStarsButton
              username={"naresh-khatri"}
              repo={"cd-judge-api"}
            />

            <Button
              size="lg"
              onClick={async () => {
                await authClient.signIn.social({
                  provider: "google",
                  callbackURL: "/dashboard",
                });
              }}
            >
              Sign in with Google
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={async () => {
                await authClient.signIn.social({
                  provider: "github",
                  callbackURL: "/dashboard",
                });
              }}
            >
              <Github size={18} />
              Sign in with GitHub
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            Get started in seconds — completely free
          </p>
        </div>
      </div>
    </main>
  );
}
