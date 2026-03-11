import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة توليد التقارير",
  description: "Report Generation Platform - AI-powered Arabic reports",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
