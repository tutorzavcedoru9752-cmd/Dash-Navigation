import { Navigation } from './Navigation';
import { Footer } from './Footer';
import { Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
      <Navigation />
      <div className="flex-grow flex flex-col items-center w-full">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
