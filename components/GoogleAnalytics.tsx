"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { getStoredConsent } from "./CookieConsent";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-XXXXXXXXXX";

export default function GoogleAnalytics() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (getStoredConsent() === "granted") {
      setConsented(true);
    }

    function onConsentChange(e: Event) {
      const detail = (e as CustomEvent).detail;
      setConsented(detail === "granted");
    }

    window.addEventListener("cookie-consent-change", onConsentChange);
    return () =>
      window.removeEventListener("cookie-consent-change", onConsentChange);
  }, []);

  if (
    process.env.NODE_ENV !== "production" ||
    GA_MEASUREMENT_ID === "G-XXXXXXXXXX" ||
    !consented
  ) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
