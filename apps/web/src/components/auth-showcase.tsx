"use client";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "~/auth/client";
import { Button } from "~/components/ui/button";
import { env } from "~/env";

export function AuthShowcase() {
  const { data: session } = authClient.useSession();

  if (!session) {
    return (
      <form>
        <Button
          size="lg"
          formAction={async () => {
            "use server";
            const res = await authClient.signIn({
              body: {
                provider: "github",
                callbackURL: "/",
              },
            });
            if (!res.url) {
              throw new Error("No URL returned from signInSocial");
            }

            const url = new URL(res.url);
            const state = url.searchParams.get("state");
            if (state) {
              // Append current base URL to state so dispatcher knows where to return
              url.searchParams.set("state", `${state}__${env.BASE_URL}`);
            }

            redirect(url.toString());
          }}
        >
          Sign in with GitHub
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl">
        <span>Logged in as {session.user.name}</span>
      </p>

      <form>
        <Button
          size="lg"
          formAction={async () => {
            "use server";
            await auth.api.signOut({
              headers: await headers(),
            });
            redirect("/");
          }}
        >
          Sign out
        </Button>
      </form>
    </div>
  );
}
