import { AuthProvider } from "../context/AuthContext";
import { ChatProvider } from "../context/ChatContext";
import "./globals.css";
import { Inter } from "next/font/google";

// Load Inter font with the className approach
// This is the most reliable way to apply Google Fonts in Next.js 14
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "WatchParty — Watch Together",
    template: "%s | WatchParty",
  },
  description:
    "Watch movies with friends in perfect real-time sync. Create a room, share the code, and enjoy together no matter where you are.",
  keywords: [
    "watch party",
    "watch together",
    "synchronized streaming",
    "movies online",
    "watch with friends",
  ],
  openGraph: {
    title: "WatchParty — Watch Together",
    description: "Watch movies with friends in perfect real-time sync.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/*
        Apply inter.className directly to body
        This is the correct way — no need for variable or cn()
        inter.className contains the actual font-family CSS class
      */}
      <body className={`${inter.className} bg-gray-950 min-h-screen`}>
        <AuthProvider>
          <ChatProvider>{children}</ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}