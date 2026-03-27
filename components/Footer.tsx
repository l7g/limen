import Link from "next/link";
import { Heart } from "lucide-react";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200/60 bg-gray-50/50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* Brand */}
          <div className="space-y-3">
            <Logo variant="compact" size="sm" />
            <p className="max-w-xs text-[13px] leading-relaxed text-gray-500">
              Un unico punto per trovare, capire e combinare i dati aperti
              italiani — catalogo strutturato e workbench cartografico.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-12 text-[13px]">
            <div className="space-y-2">
              <p className="font-medium text-gray-800">Piattaforma</p>
              <nav className="flex flex-col gap-1.5 text-gray-500">
                <Link
                  href="/workbench"
                  className="hover:text-gray-900 transition-colors"
                >
                  Workbench
                </Link>
                <Link
                  href="/dati"
                  className="hover:text-gray-900 transition-colors"
                >
                  Catalogo Dati
                </Link>
                <Link
                  href="/info"
                  className="hover:text-gray-900 transition-colors"
                >
                  Info
                </Link>
              </nav>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-gray-800">Risorse</p>
              <nav className="flex flex-col gap-1.5 text-gray-500">
                <a
                  href="https://sardegna.limen.city"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-900 transition-colors"
                >
                  Limen Sardegna
                </a>
                <a
                  href="https://github.com/laurentmusic/limen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-900 transition-colors"
                >
                  GitHub
                </a>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-gray-200/60 pt-6 text-[12px] text-gray-400 md:flex-row">
          <p>Open source (MIT) · Dati derivati CC BY 4.0</p>
          <a
            href="https://github.com/sponsors/laurentmusic"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 text-gray-400 transition-colors hover:text-[#00D9A3]"
            title="Supporta il progetto"
          >
            <Heart className="h-3.5 w-3.5 transition-colors group-hover:fill-[#00D9A3]" />
            <span>Supporta</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
