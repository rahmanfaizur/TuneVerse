import "./globals.css";
import type { Metadata, Viewport } from "next";
import { SocketProvider } from "../context/SocketContext";
import { AuthProvider } from "../context/AuthContext";
import { SpotifyProvider } from "../context/SpotifyContext";
import { Toaster } from "sonner";
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
  themeColor: "#f2f3f5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${anton.variable} ${archivo.variable} font-sans antialiased`}>
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
      </body>
    </html>
  );
}
