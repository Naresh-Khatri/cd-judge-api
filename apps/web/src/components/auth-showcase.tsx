"use client";

import { useRouter } from "next/navigation";

import { authClient } from "~/auth/client";
import { Button } from "~/components/ui/button";
import { env } from "~/env";

export function AuthShowcase() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  if (!session) {
    return (
      <Button
        size="lg"
        onClick={async () => {
          const res = await authClient.signIn.social({
            provider: "github",
            callbackURL: "/",
          });

          if (!res.data?.url) {
            return;
          }

          const url = new URL(res.data.url);
          const state = url.searchParams.get("state");
          if (state) {
            // Append current base URL to state so dispatcher knows where to return
            url.searchParams.set(
              "state",
              `${state}__${env.NEXT_PUBLIC_BASE_URL}`,
            );
          }

          window.location.href = url.toString();
        }}
      >
        Sign in with GitHub
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl">
        <span>Logged in as {session.user.name}</span>
      </p>

      <Button
        size="lg"
        onClick={async () => {
          await authClient.signOut();
          router.refresh();
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
