import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSeoForPath } from '../../../seoConfig.js';

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href, extra = {}) {
  const selector = extra.hreflang
    ? `link[rel="${rel}"][hreflang="${extra.hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  if (extra.hreflang) el.setAttribute('hreflang', extra.hreflang);
  el.setAttribute('href', href);
}

function upsertJsonLd(data) {
  let el = document.getElementById('seo-jsonld');
  if (!el) {
    el = document.createElement('script');
    el.id = 'seo-jsonld';
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export default function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = getSeoForPath(pathname);
    document.title = seo.title;
    document.documentElement.lang = seo.lang || 'hi';
    upsertMeta('name', 'description', seo.description);
    upsertMeta('name', 'robots', seo.robots || 'index, follow');
    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:url', seo.canonical);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:image', seo.image);
    upsertMeta('property', 'og:locale', 'hi_IN');
    upsertMeta('property', 'og:site_name', 'Mera Astro AI');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', seo.title);
    upsertMeta('name', 'twitter:description', seo.description);
    upsertMeta('name', 'twitter:image', seo.image);
    upsertLink('canonical', seo.canonical);
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((node) => node.remove());
    (seo.alternates || []).forEach((alt) => {
      upsertLink('alternate', alt.href, { hreflang: alt.hreflang });
    });
    upsertJsonLd(seo.jsonLd);
  }, [pathname]);

  return null;
}
