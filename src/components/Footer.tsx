import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant py-12 px-6 md:px-8 mt-auto w-full">
      <div className="max-w-container-max-width mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="text-xl font-bold tracking-tight text-primary">Dash</span>
          <p className="text-on-surface-variant text-label-sm font-sans text-xs">
            © 2024 Minimalist Dash. Designed for focus.
          </p>
        </div>
        <div className="flex gap-8 text-on-surface-variant text-label-sm">
          <Link to="#" className="hover:text-primary transition-colors hover:underline">Documentation</Link>
          <Link to="#" className="hover:text-primary transition-colors hover:underline">GitHub</Link>
          <Link to="#" className="hover:text-primary transition-colors hover:underline">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
