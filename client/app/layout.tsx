import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google"; // Changed from Geist
import "./globals.css";

// Configure Cinzel (Serif / Display)
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700", "900"], // Regular, Bold, Black
});

// Configure Inter (Sans / UI)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "600"], // Light, Regular, SemiBold
});

export const metadata: Metadata = {
  title: "SHIN: The Struggle",
  description: "A 2D PvP fighting game with Igbo folklore style.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${cinzel.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
