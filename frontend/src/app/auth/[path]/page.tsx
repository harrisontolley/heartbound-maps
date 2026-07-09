import type { Metadata } from "next";
import Link from "next/link";
import { AuthView } from "@neondatabase/auth/react/ui";
import { authViewPaths } from "@neondatabase/auth/react/ui/server";

// Neon Auth pages: /auth/sign-in, /auth/sign-up, /auth/forgot-password, /auth/callback,
// etc. AuthView renders the form for the path segment; Google sign-in is enabled via
// the provider's social prop. Prebuilt at the known view paths.

// Auth forms are private chrome: never indexed.
export const metadata: Metadata = {
  title: "Sign in | Heartbound Maps",
  robots: { index: false, follow: false },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-canvas px-6 py-16">
      <Link href="/" className="font-display text-3xl tracking-[-0.32px] text-ink">
        Heartbound Maps
      </Link>
      <div className="w-full max-w-sm">
        <AuthView path={path} />
      </div>
    </main>
  );
}
