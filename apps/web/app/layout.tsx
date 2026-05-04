// LeadForge — Root Layout with full app structure
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LeadForge — Signal-Powered Lead Intelligence',
  description: 'Find businesses the moment they need help. AI-powered lead scoring, signal detection, and multi-channel outreach.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
