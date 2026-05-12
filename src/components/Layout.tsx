import type { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import { WhatsAppFloatingButton } from "./WhatsAppButton";
import { NewsletterPopup } from "./NewsletterPopup";

export function Layout({ children, hideFooter }: { children: ReactNode; hideFooter?: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="pb-24 md:pb-12">{children}</main>
      {!hideFooter && <Footer />}
      <BottomNav />
      <WhatsAppFloatingButton />
      <NewsletterPopup />
    </div>
  );
}
