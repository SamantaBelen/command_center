import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finanzas",
  description: "Mis finanzas",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Finanzas" },
};

export const viewport: Viewport = {
  themeColor: "#efe9e0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="wrap">{children}</div>
      </body>
    </html>
  );
}
