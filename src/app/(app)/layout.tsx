import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { Copilot } from '@/components/copilot/Copilot';
import { LiveControl } from '@/components/sim/LiveControl';

// Chrome for the authenticated app (route group — does not affect URLs). The
// login page lives outside this group so it renders full-screen with no chrome.
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar />
          <main className="flex-1 px-7 py-7 max-w-[1500px] w-full mx-auto">{children}</main>
        </div>
      </div>
      <Copilot />
      <LiveControl />
    </>
  );
}
