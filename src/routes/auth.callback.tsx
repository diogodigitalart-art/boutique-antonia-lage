import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/",
  }),
  head: () => ({ meta: [{ title: "A entrar… | Boutique Antónia Lage" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  useEffect(() => {
    let done = false;
    const finish = (target: string) => {
      if (done) return;
      done = true;
      navigate({ to: target, replace: true });
    };

    // If a session is already restored, go straight in.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish(redirect || "/");
    });

    // Otherwise wait for the auth state listener to fire after token exchange.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(redirect || "/");
    });

    // Safety net: if nothing happens within 8s, send back to login.
    const timeout = window.setTimeout(() => finish(`/login?redirect=${encodeURIComponent(redirect || "/")}`), 8000);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [navigate, redirect]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">A finalizar a tua sessão…</p>
    </div>
  );
}