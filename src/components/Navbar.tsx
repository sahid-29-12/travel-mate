"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Car, Map, Menu, MessageSquare, UserRound, X, Sparkles, Moon, Sun } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  };

  const navLinkClass = (href: string) =>
    `flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
      pathname === href || (href !== "/" && pathname.startsWith(href))
        ? "bg-primary-light text-primary-strong"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
    }`;

  return (
    <nav 
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled 
          ? "border-b border-gray-200/80 bg-white/80 dark:bg-surface/80 dark:border-gray-800/80 shadow-sm backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="group flex items-center gap-3" onClick={() => setMenuOpen(false)}>
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110">
              <Car className="h-6 w-6 relative z-10" />
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-accent-warm opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">Travel<span className="text-primary">Mate</span></span>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <Link href="/ride-share" className={navLinkClass("/ride-share")}>
              <MessageSquare className="h-4 w-4" />
              Ride Share
            </Link>
            <Link href="/compare" className={navLinkClass("/compare")}>
              <Map className="h-4 w-4" />
              Compare
            </Link>
            <Link href="/messages" className={navLinkClass("/messages")}>
              <MessageSquare className="h-4 w-4" />
              Messages
            </Link>
            <Link href="/profile" className={navLinkClass("/profile")}>
              <UserRound className="h-4 w-4" />
              Profile
            </Link>
            <div className="ml-4 h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
            <Link href="/login" className="ml-4 rounded-xl bg-gray-900 dark:bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-gray-800 dark:hover:bg-primary-strong hover:shadow-lg active:scale-95">
              Sign In
            </Link>
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="ml-2 relative flex h-10 w-20 items-center rounded-full bg-gray-200 p-1 shadow-inner transition-colors duration-500 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-surface"
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <div 
                className={`absolute left-1 flex h-8 w-8 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] ${
                  isDarkMode ? "translate-x-10 bg-gray-900" : "translate-x-0"
                }`}
              >
                {isDarkMode ? (
                  <Moon className="h-4 w-4 text-primary transition-opacity duration-300" />
                ) : (
                  <Sun className="h-4 w-4 text-accent-warm transition-opacity duration-300" />
                )}
              </div>
            </button>
          </div>

          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 md:hidden"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <div 
          className={`grid overflow-hidden transition-all duration-300 ease-in-out md:hidden ${
            menuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div
            id="mobile-navigation"
            className={`-mx-4 flex min-h-0 flex-col gap-1 overflow-hidden border-t border-gray-200/80 bg-white/95 px-4 py-3 shadow-lg shadow-gray-900/5 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/95 ${
              menuOpen ? "visible" : "invisible"
            }`}
          >
            <Link href="/ride-share" className={navLinkClass("/ride-share")} onClick={() => setMenuOpen(false)}>
              <MessageSquare className="h-5 w-5" />
              Ride Share
            </Link>
            <Link href="/compare" className={navLinkClass("/compare")} onClick={() => setMenuOpen(false)}>
              <Map className="h-5 w-5" />
              Compare Transit
            </Link>
            <Link href="/messages" className={navLinkClass("/messages")} onClick={() => setMenuOpen(false)}>
              <MessageSquare className="h-5 w-5" />
              Messages
            </Link>
            <Link href="/profile" className={navLinkClass("/profile")} onClick={() => setMenuOpen(false)}>
              <UserRound className="h-5 w-5" />
              Profile
            </Link>
            <Link href="/login" className="mt-2 rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-white shadow-md transition-transform active:scale-95" onClick={() => setMenuOpen(false)}>
              Sign In
            </Link>
            
            {/* Mobile Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="mt-2 flex w-full items-center justify-between rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 transition-colors focus:outline-none"
            >
              <span>{isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
              {isDarkMode ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-accent-warm" />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
