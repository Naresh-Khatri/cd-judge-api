import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Clock, Code2, Shield, Zap } from "lucide-react";

import { auth, getSession } from "~/auth/server";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

export default async function HomePage() {
  const session = await getSession();

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
            A free and open-source Judge0 alternative for code execution. Run
            code securely in multiple programming languages.
          </p>
        </div>

        {/* Features */}
        <div className="grid w-full gap-4 sm:grid-cols-3">
          <Card className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              <Code2 className="text-primary" size={24} />
            </div>
            <h3 className="font-semibold">Multi-Language</h3>
            <p className="text-muted-foreground text-sm">
              Support for popular programming languages
            </p>
          </Card>
          <Card className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              <Shield className="text-primary" size={24} />
            </div>
            <h3 className="font-semibold">Secure</h3>
            <p className="text-muted-foreground text-sm">
              Isolated execution environment for safety
            </p>
          </Card>
          <Card className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              <Clock className="text-primary" size={24} />
            </div>
            <h3 className="font-semibold">Fast</h3>
            <p className="text-muted-foreground text-sm">
              Quick execution with real-time results
            </p>
          </Card>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4">
          <form>
            <Button
              size="lg"
              formAction={async () => {
                "use server";
                const res = await auth.api.signInSocial({
                  body: {
                    provider: "github",
                    callbackURL: "/dashboard",
                  },
                });
                if (!res.url) {
                  throw new Error("No URL returned from signInSocial");
                }
                redirect(res.url);
              }}
            >
              Sign in with GitHub
            </Button>
          </form>
          <p className="text-muted-foreground text-sm">
            Get started in seconds with your GitHub account
          </p>
        </div>
      </div>
    </main>
  );
}
