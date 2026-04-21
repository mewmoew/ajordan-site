import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron, VT323 } from "next/font/google";
import { isMaintenanceMode } from "@/lib/maintenance";
import { MaintenanceScreen } from "./maintenance-screen";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "AJORDAN",
  description: "AJORDAN — Designer · Builder · Architect",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const maintenance = isMaintenanceMode();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} ${vt323.variable} h-full`}
    >
      <body className="h-full">
        {maintenance ? <MaintenanceScreen /> : children}
      </body>
    </html>
  );
