import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Web-only HTML shell wrapped around the app during static export. Sets the page
 * title, meta tags and theme colour so the GitHub Pages site looks finished in
 * the browser tab and when shared. (Has no effect on native.)
 */
const TITLE = 'Aussie Boyz World Cup';
const DESCRIPTION = 'Live scores, fixtures and group standings for the 2026 FIFA World Cup.';
// Must match app.json → experiments.baseUrl (the GitHub Pages subpath). Files in
// public/ are copied to the export root and served under this prefix.
const BASE = '/aussie-boyz-world-cup-app';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="theme-color" content="#1FA05A" />

        {/* Home-screen install: real app icon + standalone (no browser chrome). */}
        <link rel="manifest" href={`${BASE}/manifest.json`} />
        <link rel="apple-touch-icon" href={`${BASE}/apple-touch-icon.png`} />
        <link rel="icon" type="image/png" sizes="192x192" href={`${BASE}/icons/icon-192.png`} />
        <meta name="apple-mobile-web-app-title" content="Aussie Boyz WC" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />

        {/* Keeps the body background consistent before the JS bundle mounts. */}
        <style dangerouslySetInnerHTML={{ __html: BODY_BG }} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}

const BODY_BG = `
@media (prefers-color-scheme: dark) {
  body { background-color: #0E1116; }
}
@media (prefers-color-scheme: light) {
  body { background-color: #F6F7F9; }
}
`;
