import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function InfoPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />

      <main className="mx-auto w-full max-w-3xl px-6 py-10 md:py-14">
        <p className="text-[13px] font-medium tracking-wide uppercase text-[#00D9A3]">
          Il progetto
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-gray-900">
          Info
        </h1>

        <div className="mt-8 space-y-8 text-[14px] leading-relaxed text-gray-600">
          <div>
            <p>
              I dati pubblici italiani sono frammentati su decine di portali
              istituzionali, ognuno con formati, cadenze e modalità di accesso
              diversi. <strong className="text-gray-900">Limen</strong> risolve
              questo problema con due esperienze parallele: un{" "}
              <strong className="text-gray-900">catalogo dati</strong> per
              scoprire, esplorare inline e combinare dataset da fonti diverse, e
              un{" "}
              <strong className="text-gray-900">workbench cartografico</strong>{" "}
              per visualizzare i dati su mappa e creare mappe tematiche — tutto
              nel browser, senza login.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-lg font-semibold text-gray-900">
              Metodologia
            </h2>
            <p className="mt-2">
              I dati provengono da fonti ufficiali (ISTAT, ACI, ISPRA, GTFS
              degli operatori di trasporto) e vengono aggiornati automaticamente
              o con avvisi di scadenza. Ogni dataset ha metadati di freschezza
              trasparenti consultabili nel catalogo.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-lg font-semibold text-gray-900">
              Copertura
            </h2>
            <p className="mt-2">
              La piattaforma è Italia-first: confini, popolazione, redditi,
              veicoli e scuole coprono tutte le regioni. Dati GTFS e indicatori
              derivati sono oggi disponibili per la Sardegna — l&apos;espansione
              ad altre regioni è in corso. Ogni dataset indica onestamente la
              propria copertura geografica.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-lg font-semibold text-gray-900">
              Open Source
            </h2>
            <p className="mt-2">
              Codice sorgente:{" "}
              <a
                href="https://github.com/laurentmusic/limen"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#00D9A3] hover:text-[#00B386] transition-colors"
              >
                MIT License
              </a>
              . Dati derivati: CC BY 4.0. Contribuzioni benvenute.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-lg font-semibold text-gray-900">
              Progetti correlati
            </h2>
            <ul className="mt-2 space-y-1.5">
              <li>
                <a
                  href="https://sardegna.limen.city"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#00D9A3] hover:text-[#00B386] transition-colors"
                >
                  Limen Sardegna
                </a>{" "}
                — App regionale con analisi dettagliata della Sardegna
              </li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
