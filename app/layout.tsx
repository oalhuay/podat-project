import type { Metadata } from "next";
import { AuthProvider } from "@/app/hooks/useAuth";
import GlobalSplashGate from "@/components/system/GlobalSplashGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "PODAT",
  description: "Plataforma académica para gestión de alumnos, notas y asistencia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript = `
    (function () {
      var storageKey = "podat-theme-preference";
      var root = document.documentElement;
      var stored = null;
      try {
        stored = localStorage.getItem(storageKey);
      } catch (error) {
        stored = null;
      }
      var preference = stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
      var resolved = preference === "system"
        ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : preference;
      root.dataset.themePreference = preference;
      root.dataset.themeResolved = resolved;
      root.style.colorScheme = resolved;
    })();
  `;

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <GlobalSplashGate>{children}</GlobalSplashGate>
        </AuthProvider>
      </body>
    </html>
  );
}
