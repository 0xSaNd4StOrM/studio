import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/hooks/use-cart.tsx';
import { Header } from '@/components/header';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Wanderlust Hub',
  description: 'Your ultimate destination for curated tour packages.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <CartProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <footer className="bg-primary text-primary-foreground py-6 text-center">
              <p>&copy; {new Date().getFullYear()} Wanderlust Hub. All rights reserved.</p>
            </footer>
          </div>
          <Toaster />
        </CartProvider>
      </body>
    </html>
  );
}
