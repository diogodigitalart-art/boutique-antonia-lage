import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoUrl from "@/assets/logo.svg";

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("A password deve ter pelo menos 6 caracteres");
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
    if (error) return toast.error(error.message);
    toast.success("Conta criada. Bem-vinda à boutique.");
    navigate({ to: "/perfil" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mx-auto mb-10 flex justify-center">
          <img src={logoUrl} alt="Boutique Antónia Lage" className="h-10 w-auto" />
        </Link>
        <h1 className="text-center font-display text-3xl italic text-foreground">Criar conta</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Junta-te à Boutique Antónia Lage
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {[
            { label: "Nome", type: "text", value: name, set: setName },
            { label: "Email", type: "email", value: email, set: setEmail },
            { label: "Password", type: "password", value: password, set: setPassword },
            { label: "Confirmar password", type: "password", value: confirm, set: setConfirm },
          ].map((f) => (
            <div key={f.label}>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                {f.label}
              </label>
              <input
                type={f.type}
                required
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "A criar…" : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tens conta?{" "}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
