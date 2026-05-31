import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

type DashboardShellProps = {
  children: React.ReactNode;
};

/** Lovable-style shell: padded frame, inset sidebar, rounded main panel */
export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <SidebarProvider className="min-h-svh w-full bg-background p-2 [--sidebar-rail-gutter:0.5rem] sm:p-3 sm:[--sidebar-rail-gutter:0.75rem]">
      <AppSidebar />
      <SidebarInset className="flex min-h-[calc(100svh-1rem)] sm:min-h-[calc(100svh-1.5rem)] flex-1 flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-card shadow-none md:peer-data-[state=collapsed]:peer-data-[variant=inset]:!ml-0 md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:rounded-3xl">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
