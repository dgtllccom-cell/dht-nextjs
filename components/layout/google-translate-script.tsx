"use client";

import Script from "next/script";

export function GoogleTranslateScript() {
  return (
    <>
      <div id="google_translate_element" style={{ display: "none" }}></div>
      <Script
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="lazyOnload"
      />
      <Script id="google-translate-init" strategy="lazyOnload">
        {`
          window.googleTranslateElementInit = function() {
            new window.google.translate.TranslateElement(
              { pageLanguage: 'en', autoDisplay: false },
              'google_translate_element'
            );
          }
        `}
      </Script>
    </>
  );
}
