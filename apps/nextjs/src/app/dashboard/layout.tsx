"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { DashboardHeader } from "~/components/dashboard-header";
import { PricingModal } from "~/components/pricing-modal";
import { SidebarNav } from "~/components/sidebar-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  return (
    <div className="bg-background text-foreground flex h-screen overflow-hidden">
      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`bg-background border-border fixed inset-y-0 left-0 z-30 w-72 transform border-r transition-transform duration-300 ease-in-out lg:static ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-4 right-4 rounded-lg p-2 lg:hidden"
        >
          <X size={20} />
        </button>
        <SidebarNav onOpenPlans={() => setIsPricingOpen(true)} />
      </div>

      {/* Main Content */}
      <div className="relative flex h-full flex-1 flex-col overflow-hidden">
        <DashboardHeader onOpenMobileSidebar={() => setIsSidebarOpen(true)} />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
