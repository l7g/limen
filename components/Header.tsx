"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const nav = [
  { href: "/dati", label: "Dati" },
  { href: "/workbench", label: "Workbench" },
  { href: "/info", label: "Info" },
] as const;

export default function Header() {
  const pathname = usePathname();

  return (
    <header
      className="h-12 md:h-14 bg-white/90 backdrop-blur-md border-b border-gray-200/60 shrink-0 z-50 relative"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="h-full max-w-6xl mx-auto px-3 md:px-6 flex items-center justify-between">
        <Link href="/" className="hover:opacity-80 transition-opacity shrink-0">
          <span className="md:hidden">
            <Logo variant="compact" size="sm" />
          </span>
          <span className="hidden md:inline">
            <Logo variant="horizontal" size="md" />
          </span>
        </Link>

        <nav className="flex items-center gap-3 md:gap-5 text-[12px] md:text-[13px] font-medium shrink-0">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                pathname === href || pathname?.startsWith(href + "/")
                  ? "page"
                  : undefined
              }
              className={
                pathname === href || pathname?.startsWith(href + "/")
                  ? "text-gray-900 transition-colors"
                  : "text-gray-500 hover:text-gray-900 transition-colors"
              }
            >
              {label}
            </Link>
          ))}
          <a
            href="https://github.com/l7g/limen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-700 transition-colors ml-1"
            aria-label="GitHub"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </nav>
      </div>
    </header>
  );
}
