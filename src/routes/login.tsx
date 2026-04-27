import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import logoUrl from "@/assets/logo.svg";
import { translateAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/perfil",
  }),
  head: () => ({ meta: [{ title: "Entrar | Boutique Antónia Lage" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        navigate({ to: redirect || "/", replace: true });
      } else {
        setCheckingSession(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate({ to: redirect || "/", replace: true });
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, redirect]);

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">A carregar…</div>
      </div>
    );
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Bem-vinda de volta");
    navigate({ to: redirect });
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${redirect || "/"}`,
    });
    if (result.error) {
      toast.error(translateAuthError(result.error.message));
      return;
    }
    if (!result.redirected) navigate({ to: redirect || "/" });
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Indica o teu email");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Verifica o teu email para redefinir a password");
    setShowReset(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mx-auto mb-10 flex justify-center">
          <img src={logoUrl} alt="Boutique Antónia Lage" className="h-10 w-auto" />
        </Link>
        <h1 className="text-center font-display text-3xl italic text-foreground">
          {showReset ? "Recuperar password" : "Entrar"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {showReset
            ? "Enviamos-te um link de recuperação"
            : "Acede ao teu perfil e wishlist"}
        </p>

        <form onSubmit={showReset ? handleReset : handleLogin} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
          {!showReset && (
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "A processar…" : showReset ? "Enviar link" : "Entrar"}
          </button>
        </form>

        {!showReset && (
          <>
            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">ou</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <button
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-card px-6 py-3 text-sm text-foreground transition hover:bg-muted"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
            </button>
            <div className="mt-6 space-y-2 text-center text-sm">
              <button
                onClick={() => setShowReset(true)}
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Esqueci a minha password
              </button>
              <p className="text-muted-foreground">
                Ainda sem conta?{" "}
                <Link to="/registo" className="text-primary underline-offset-4 hover:underline">
                  Criar conta
                </Link>
              </p>
            </div>
          </>
        )}
        {showReset && (
          <button
            onClick={() => setShowReset(false)}
            className="mt-6 block w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar
          </button>
        )}
      </div>
    </div>
  );
}
