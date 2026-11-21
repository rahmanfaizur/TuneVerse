import "./globals.css";
import type { Metadata, Viewport } from "next";
import { SocketProvider } from "../context/SocketContext";
import { AuthProvider } from "../context/AuthContext";
import { SpotifyProvider } from "../context/SpotifyContext";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { PAPER_ATTRIBUTE_VALUES, PAPERS } from "../components/poster/papers";
import { Anton, Archivo } from "next/font/google";
import NavigationProgress from "../components/NavigationProgress";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TuneVerse",
  description: "Start a room, play a song from YouTube or Spotify, and everyone hears the same second of it.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1647" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${anton.variable} ${archivo.variable} font-sans antialiased`}>
        {/* "system" picks day or night from the device; a picked paper is remembered. */}
        <ThemeProvider
          attribute="data-paper"
          themes={PAPERS.map((paper) => paper.id)}
          value={PAPER_ATTRIBUTE_VALUES}
          defaultTheme="system"
          enableSystem
          storageKey="tuneverse-paper"
        >
          <AuthProvider>
            <SpotifyProvider>
              <SocketProvider>
                <NavigationProgress />
                {children}
                <Toaster
                  position="bottom-center"
                  toastOptions={{
                    style: {
                      background: "var(--ink)",
                      color: "var(--paper)",
                      border: "none",
                      borderRadius: 0,
                      fontFamily: "var(--font-sans)",
                      fontSize: 15,
                    },
                  }}
                />
              </SocketProvider>
            </SpotifyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
