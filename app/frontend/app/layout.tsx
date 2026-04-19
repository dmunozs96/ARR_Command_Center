import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "ARR Command Center - isEazy",
  description: "Panel de control ARR para el equipo de finanzas de isEazy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="flex min-h-full bg-gray-50 text-gray-900 antialiased">
        <Providers>
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
