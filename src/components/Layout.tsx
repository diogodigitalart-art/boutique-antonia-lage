import type { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";

export function Layout({ children, hideFooter }: { children: ReactNode; hideFooter?: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="pb-24 md:pb-12">{children}</main>
      {!hideFooter && <Footer />}
      <BottomNav />
    </div>
  );
}
