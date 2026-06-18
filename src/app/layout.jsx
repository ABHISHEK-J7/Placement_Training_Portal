import "./globals.css";
import { ThemeProvider, themeInitScript } from "@/components/layout/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const SITE_NAME = "Torii Minds";
const SITE_URL = "https://toriiminds.com";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Step IN, Stand OUT`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Torii Minds — a gateway to tech excellence through experiential, AI-ready learning, placement training, and coding mastery.",
  applicationName: SITE_NAME,
  keywords: [
    "Torii Minds",
    "AI Ready Engineer",
    "Placement Training",
    "Aptitude",
    "Coding",
    "2027 Batch",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Step IN, Stand OUT`,
    description:
      "Experiential, AI-ready learning and placement training that takes engineers from trainee to skilled professional.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Step IN, Stand OUT`,
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply theme before paint to avoid a flash of incorrect theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <ThemeProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>
          <Navbar />
          <main id="main">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
