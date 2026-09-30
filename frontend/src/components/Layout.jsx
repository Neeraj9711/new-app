import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ProfileCompleteModal from './ProfileCompleteModal';

export default function Layout() {
  return (
    <div className="app-shell">
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <Footer />
      <ProfileCompleteModal />
    </div>
  );
}
