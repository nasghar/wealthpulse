import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { Copilot } from '@/components/copilot/Copilot';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WealthPulse · Real-Time Wealth Platform',
  description: 'Real-time wealth management powered by SingleStore HTAP',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="flex">
          <Sidebar />
          <div className="flex-1 min-w-0 flex flex-col">
            <TopBar />
            <main className="flex-1 px-7 py-7 max-w-[1500px] w-full mx-auto">{children}</main>
          </div>
        </div>
        <Copilot />
      </body>
    </html>
  );
}
