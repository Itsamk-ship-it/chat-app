import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/contexts/AppContext';

export const metadata: Metadata = {
  title: 'ChatApp',
  description: 'Real-time enterprise messaging',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
