import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '美国各州学习地图 | US States Study Map',
  description: '一张可点击、可朗读、可测验的中英双语美国五十州学习地图。',
  openGraph: {
    title: '美国各州学习地图',
    description: 'Explore • Listen • Quiz — 中英双语美国五十州互动学习地图。',
    images: [{ url: '/og.png', width: 1662, height: 946, alt: '美国各州学习地图' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '美国各州学习地图',
    description: 'Explore • Listen • Quiz — 中英双语美国五十州互动学习地图。',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
