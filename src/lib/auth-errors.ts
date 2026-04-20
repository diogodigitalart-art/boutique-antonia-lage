// Translates common Supabase auth error messages to Portuguese.
export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials"))
    return "Email ou password incorrectos";
  if (m.includes("user already registered") || m.includes("already registered") || m.includes("user_already_exists"))
    return "Este email já está registado";
  if (m.includes("password should be at least") || m.includes("weak_password") || m.includes("password is too short"))
    return "Password demasiado fraca — deve ter pelo menos 8 caracteres, uma maiúscula e um número";
  if (m.includes("email not confirmed"))
    return "Confirma o teu email antes de entrar";
  if (m.includes("invalid email") || m.includes("email address") && m.includes("invalid"))
    return "Email inválido";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiadas tentativas. Tenta novamente em alguns minutos.";
  if (m.includes("network") || m.includes("fetch"))
    return "Erro de ligação. Verifica a tua internet.";
  if (m.includes("user not found"))
    return "Não encontrámos uma conta com este email";
  if (m.includes("same password"))
    return "A nova password deve ser diferente da actual";
  return "Ocorreu um erro. Tenta novamente.";
}

// Strong password: min 8 chars, 1 uppercase, 1 number
export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Mínimo 8 caracteres";
  if (!/[A-Z]/.test(password)) return "Tem de incluir uma letra maiúscula";
  if (!/[0-9]/.test(password)) return "Tem de incluir um número";
  return null;
}

export const PASSWORD_HINT = "Mínimo 8 caracteres, uma letra maiúscula e um número";
