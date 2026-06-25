import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pinprint — poster maps of the places that matter",
  description:
    "Turn the places you have ties to into a poster: arrows pointing in each place's true compass direction from home, labeled with the great-circle distance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full bg-canvas text-body">
        {children}
      </body>
    </html>
  );
}
