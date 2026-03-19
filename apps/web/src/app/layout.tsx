import "./globals.css";
import { SocketProvider } from "../context/SocketContext";
import { AuthProvider } from "../context/AuthContext";
import { SpotifyProvider } from "../context/SpotifyContext";
import { Toaster } from "sonner";
import { Playfair_Display, Inter } from "next/font/google";
import { ThemeProvider } from "../components/ThemeProvider";
import { ThemeToggle } from "../components/ThemeToggle";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
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
      <body className={`${playfair.variable} ${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SpotifyProvider>
              <SocketProvider>
                {children}
                <ThemeToggle />
                <Toaster position="top-center" richColors />
              </SocketProvider>
            </SpotifyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
