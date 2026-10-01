// For adding custom fonts with other frameworks, see:
// https://tailwindcss.com/docs/font-family
import type { Metadata } from "next";
import { Raleway, Lora, Fira_Code } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { routing } from "@/i18n/routing";
import "../globals.css";
import { ThemeProvider } from "@/lib/providers/theme-provider";
import { Footer } from "@/components/fi/footer";
import { Toaster } from "@/components/ui/sonner";

const fontSans = Raleway({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontSerif = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
});

const fontMono = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Academy Fi",
  description: "Learning how to develop modern websites",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} flex min-h-screen flex-col antialiased`}
      >
        <NextIntlClientProvider>
          <ThemeProvider attribute="class">
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
              {children}
            </div>
            <Footer />
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
