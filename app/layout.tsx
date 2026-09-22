import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FAT / CYCLE | DC1 Log Studio',
  description: 'CYCPLUS DC1 exercise and fat visualization log'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
