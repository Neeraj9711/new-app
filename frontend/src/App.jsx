import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Seo from './components/Seo';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import HoroscopePage from './pages/HoroscopePage';
import PanchangPage from './pages/PanchangPage';
import KundliPage from './pages/KundliPage';

function trackPage(pathname) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('config', 'G-XWDZ464BML', { page_path: pathname });
}

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    trackPage(pathname);
  }, [pathname]);

  return (
    <>
      <Seo />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/kundli" element={<KundliPage />} />
          <Route path="/horoscope" element={<HoroscopePage />} />
          <Route path="/horoscope/:slug" element={<HoroscopePage />} />
          <Route path="/rashifal/:slug" element={<HoroscopePage />} />
          <Route path="/panchang" element={<PanchangPage />} />
        </Route>
      </Routes>
    </>
  );
}
