import "./globals.css";
import { SocketProvider } from "../context/SocketContext";
import { AuthProvider } from "../context/AuthContext";
import { SpotifyProvider } from "../context/SpotifyContext";
import { Toaster } from "sonner";
import { Bodoni_Moda, Jost } from "next/font/google";
import { ThemeProvider } from "../components/ThemeProvider";
import { ThemeToggle } from "../components/ThemeToggle";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-serif",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bodoni.variable} ${jost.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <AuthProvider>
            <SpotifyProvider>
              <SocketProvider>
                {children}
                <ThemeToggle />
                <Toaster
                  position="top-center"
                  toastOptions={{
                    style: {
                      background: "var(--foreground)",
                      color: "var(--background)",
                      border: "none",
                      borderRadius: 0,
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
