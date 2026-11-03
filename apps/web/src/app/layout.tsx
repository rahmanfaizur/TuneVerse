import "./globals.css";
import { SocketProvider } from "../context/SocketContext";
import { AuthProvider } from "../context/AuthContext";
import { SpotifyProvider } from "../context/SpotifyContext";
import { Toaster } from "sonner";
import { Figtree, Newsreader } from "next/font/google";
import { ThemeProvider } from "../components/ThemeProvider";
import { ThemeToggle } from "../components/ThemeToggle";
import NavigationProgress from "../components/NavigationProgress";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["italic"],
  variable: "--font-serif",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree.variable} ${newsreader.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <AuthProvider>
            <SpotifyProvider>
              <SocketProvider>
                <NavigationProgress />
                {children}
                <ThemeToggle />
                <Toaster
                  position="bottom-center"
                  toastOptions={{
                    style: {
                      background: "var(--foreground)",
                      color: "var(--background)",
                      border: "none",
                      borderRadius: 12,
                      fontFamily: "var(--font-sans)",
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
