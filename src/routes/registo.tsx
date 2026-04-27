import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import logoUrl from "@/assets/logo.svg";
import { translateAuthError, validatePassword, PASSWORD_HINT } from "@/lib/auth-errors";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/registo")({
  head: () => ({ meta: [{ title: "Criar conta | Boutique Antónia Lage" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        navigate({ to: "/", replace: true });
      } else {
        setCheckingSession(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate({ to: "/", replace: true });
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">A carregar…</div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const pwError = validatePassword(password);
    if (pwError) return toast.error(pwError);
    if (password !== confirm) return toast.error("As passwords não coincidem");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/perfil`,
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Conta criada. Bem-vinda à boutique.");
    navigate({ to: "/perfil" });
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/`,
    });
    if (result.error) {
      toast.error(translateAuthError(result.error.message));
      return;
    }
    if (!result.redirected) navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="mb-6 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft size={14} /> Voltar
        </button>
        <Link to="/" className="mx-auto mb-10 flex justify-center">
          <img src={logoUrl} alt="Boutique Antónia Lage" className="h-10 w-auto" />
        </Link>
        <h1 className="text-center font-display text-3xl italic text-foreground">Criar conta</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Junta-te à Boutique Antónia Lage
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field label="Nome" type="text" value={name} onChange={setName} />
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            hint={PASSWORD_HINT}
          />
          <Field
            label="Confirmar password"
            type="password"
            value={confirm}
            onChange={setConfirm}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "A criar…" : "Criar conta"}
          </button>
        </form>

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

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tens conta?{" "}
          <Link to="/login" search={{ redirect: "/perfil" }} className="text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  hint,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm outline-none focus:border-primary"
      />
      {hint && <p className="mt-1.5 px-2 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
