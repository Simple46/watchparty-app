import { AuthProvider } from "../context/AuthContext";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "WatchParty — Watch Together",
  description: "Watch movies with friends in real time",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body>
        {/*
          AuthProvider wraps the entire app
          This means every single page and component
          can access the logged in user, login, logout etc
          by calling useAuth()
        */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
