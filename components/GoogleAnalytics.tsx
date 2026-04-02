"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";
import { getStoredConsent } from "./CookieConsent";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-XXXXXXXXXX";

function useConsentGranted() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("cookie-consent-change", cb);
      return () => window.removeEventListener("cookie-consent-change", cb);
    },
    () => getStoredConsent() === "granted",
    () => false,
  );
}

export default function GoogleAnalytics() {
  const consented = useConsentGranted();

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
