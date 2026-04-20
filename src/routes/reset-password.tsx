import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoUrl from "@/assets/logo.svg";
import { translateAuthError, validatePassword, PASSWORD_HINT } from "@/lib/auth-errors";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nova password | Boutique Antónia Lage" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const pwError = validatePassword(password);
    if (pwError) return toast.error(pwError);
    if (password !== confirm) return toast.error("As passwords não coincidem");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Password actualizada");
    navigate({ to: "/perfil" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <img src={logoUrl} alt="Boutique Antónia Lage" className="mx-auto mb-10 h-10 w-auto" />
        <h1 className="text-center font-display text-3xl italic text-foreground">Nova password</h1>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Nova password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1.5 px-2 text-[11px] text-muted-foreground">{PASSWORD_HINT}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Confirmar password
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "A guardar…" : "Definir password"}
          </button>
        </form>
      </div>
    </div>
  );
}
