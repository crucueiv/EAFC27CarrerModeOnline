import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "EAFC27 Modo Carrera Online",
  description: "Modo carrera online para EA FC"
};

const links = [
  ["Inicio", "/"],
  ["Calendario", "/calendar"],
  ["Plantilla", "/squad"],
  ["Traspasos", "/transfers"],
  ["Ratings", "/admin/ratings"]
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
            <Link href="/" className="font-bold text-pitch">EAFC27 Online</Link>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              {links.map(([label, href]) => <Link key={href} href={href} className="hover:text-pitch">{label}</Link>)}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
