import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Nunito_Sans } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-serif",
  display: "swap",
});

const body = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hoy",
  description: "Mi Command Center",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hoy",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3efe7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${serif.variable} ${body.variable}`}>
      <body>
        <div className="deco deco-tr" aria-hidden>
          <svg viewBox="0 0 120 120" fill="none">
            <path d="M112 8C86 26 62 50 34 104" stroke="#aab49a" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="96" cy="22" rx="13" ry="5.5" fill="#bcc6ac" transform="rotate(-38 96 22)" />
            <ellipse cx="82" cy="36" rx="13" ry="5.5" fill="#c9d1bb" transform="rotate(-42 82 36)" />
            <ellipse cx="70" cy="52" rx="12" ry="5" fill="#bcc6ac" transform="rotate(-48 70 52)" />
            <ellipse cx="58" cy="68" rx="12" ry="5" fill="#c9d1bb" transform="rotate(-52 58 68)" />
            <ellipse cx="48" cy="86" rx="11" ry="4.5" fill="#bcc6ac" transform="rotate(-58 48 86)" />
          </svg>
        </div>
        <div className="deco deco-bl" aria-hidden>
          <svg viewBox="0 0 120 120" fill="none">
            <path d="M112 8C86 26 62 50 34 104" stroke="#aab49a" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="96" cy="22" rx="13" ry="5.5" fill="#bcc6ac" transform="rotate(-38 96 22)" />
            <ellipse cx="82" cy="36" rx="13" ry="5.5" fill="#c9d1bb" transform="rotate(-42 82 36)" />
            <ellipse cx="70" cy="52" rx="12" ry="5" fill="#bcc6ac" transform="rotate(-48 70 52)" />
            <ellipse cx="58" cy="68" rx="12" ry="5" fill="#c9d1bb" transform="rotate(-52 58 68)" />
            <ellipse cx="48" cy="86" rx="11" ry="4.5" fill="#bcc6ac" transform="rotate(-58 48 86)" />
          </svg>
        </div>
        <div className="wrap">{children}</div>
      </body>
    </html>
  );
}
