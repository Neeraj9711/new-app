import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ProfileCompleteModal from './ProfileCompleteModal';
import LocationAllowBanner from './LocationAllowBanner';

export default function Layout() {
  return (
    <div className="app-shell">
      <Header />
      <LocationAllowBanner />
      <main className="main">
        <Outlet />
      </main>
      <Footer />
      <ProfileCompleteModal />
    </div>
  );
}
