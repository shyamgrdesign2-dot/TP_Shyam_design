
import { Mulish, Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from '@/src/components/molecules/Toaster';
import './globals.css';

const mulish = Mulish({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700', '800']
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans'
});


export const metadata = {
  title: 'VoiceRx · TatvaPractice',
  description: 'VoiceRx and clinical workspace prototypes — appointments, RxPad, in-visit consultation, and print preview.',
  icons: {
    icon: [
    {
      url: '/icon-light-32x32.png',
      media: '(prefers-color-scheme: light)'
    },
    {
      url: '/icon-dark-32x32.png',
      media: '(prefers-color-scheme: dark)'
    },
    {
      url: '/icon.svg',
      type: 'image/svg+xml'
    }],

    apple: '/apple-icon.png'
  }
};

export default function RootLayout({
  children


}) {
  return (
    <html lang="en">
      <body className={`${mulish.variable} ${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>);

}