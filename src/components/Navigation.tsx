import { NavLink, Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export function Navigation() {
  return (
    <nav className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md text-zinc-900 dark:text-zinc-50 font-sans antialiased text-sm font-medium sticky top-0 z-50 border-b border-zinc-100 dark:border-zinc-800 shadow-sm w-full">
      <div className="flex justify-between items-center px-6 md:px-8 py-4 max-w-container-max-width mx-auto w-full">
        <Link to="/" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dash
        </Link>
        <div className="flex items-center gap-6 md:gap-8">
          <NavLink
            to="/"
            className={({ isActive }) =>
              cn(
                "transition-colors duration-200",
                isActive 
                  ? "text-zinc-900 dark:text-zinc-50 border-b-2 border-zinc-900 dark:border-zinc-50 pb-1 font-bold" 
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/categories"
            className={({ isActive }) =>
              cn(
                "transition-colors duration-200",
                isActive 
                  ? "text-zinc-900 dark:text-zinc-50 border-b-2 border-zinc-900 dark:border-zinc-50 pb-1 font-bold" 
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )
            }
          >
            Categories
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
