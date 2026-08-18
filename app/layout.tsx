import type { Metadata } from "next";
import { resolveManagedRoot } from "@/lib/scan";
import { Sidebar } from "./sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProjectCheckTool",
  description: "親フォルダ配下のプロジェクトの進捗・状態を俯瞰するダッシュボード",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="flex min-h-screen">
          <Sidebar managedRoot={resolveManagedRoot()} />
          <main className="min-w-0 flex-1">
            <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
