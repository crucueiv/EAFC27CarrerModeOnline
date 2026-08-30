import type { Metadata } from "next";
import HeaderNav from "@/components/nav/HeaderNav";
import Providers from "@/components/providers/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "EAFC27 Modo Carrera Online",
  description: "Modo carrera online para EA FC"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#f4f7f5] text-[#102a43] antialiased">
        <Providers>
          <HeaderNav />
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
