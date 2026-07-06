import './style.css';
import { createApp } from './ui/app';

createApp(document.getElementById('app')!);

// PWA: offline support in production, but never under test automation
// (a caching service worker would make E2E runs serve stale builds).
if (import.meta.env.PROD && !navigator.webdriver && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}
