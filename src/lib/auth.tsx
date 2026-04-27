import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type ProfileDetails = {
  city?: string;
  birth_month?: string;
  birth_year?: string;
  style_preference?: string;
  favourite_colours?: string[];
  occasions?: string[];
  heard_from?: string;
  notification_preference?: {
    channel: "email" | "whatsapp";
    whatsapp?: string;
  };
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  profile_details: ProfileDetails | null;
};

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        // Defer profile fetch to avoid deadlock
        setTimeout(() => fetchProfile(s.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) fetchProfile(s.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, profile_details")
      .eq("id", userId)
      .maybeSingle();
    if (data) {
      setProfile({
        ...data,
        profile_details: (data.profile_details as ProfileDetails | null) ?? null,
      });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("al-style-profile");
      localStorage.removeItem("al-wishlist");
      localStorage.removeItem("al-wishlist-guest");
    }
  };

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
