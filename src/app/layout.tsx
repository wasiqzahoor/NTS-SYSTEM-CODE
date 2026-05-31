import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/common/Providers";

export const metadata: Metadata = {
  // ─── Basic SEO ────────────────────────────────────────────────────────────
  title: {
    default: "NTS Management – Project & Task Management System",
    template: "%s | NTS Management",
  },
  description:
    "NTS Management is a powerful project and task management system designed to streamline team collaboration, track progress, and boost productivity.",
  keywords: [
    "NTS Management",
    "New Tech Softs",
    "project management",
    "task management",
    "team collaboration",
    "productivity",
  ],
  authors: [{ name: "NTS Management" }],
  creator: "NTS Management",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ─── Favicon ──────────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    apple: "/logo.png",
    shortcut: "/logo.png",
  },

  // ─── Google Search Console Verification ───────────────────────────────────
  // Search Console → Add Property → HTML tag → content value yahan paste karo
  // verification: {
  //   google: "APNA_VERIFICATION_CODE_YAHAN",
  // },

  // ─── Open Graph (Social Sharing) ──────────────────────────────────────────
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nts.newtechsofts.com",
    siteName: "NTS Management",
    title: "NTS Management – Project & Task Management System",
    description:
      "Streamline your team's projects and tasks with NTS Management.",
    images: [
      {
        url: "https://nts.newtechsofts.com/logo.png",
        width: 512,
        height: 512,
        alt: "NTS Management Logo",
      },
    ],
  },

  // ─── Twitter Card ─────────────────────────────────────────────────────────
  twitter: {
    card: "summary",
    title: "NTS Management – Project & Task Management System",
    description: "Streamline your team's projects and tasks with NTS Management.",
    images: ["https://nts.newtechsofts.com/logo.png"],
  },

  alternates: {
    canonical: "https://nts.newtechsofts.com",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />

        {/* Google Analytics – GA4 */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-SGVJFQXXVJ"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-SGVJFQXXVJ');
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}