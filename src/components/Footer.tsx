import Link from "next/link";
import { Car } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative z-10 mt-auto shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-surface/50 backdrop-blur-md py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between px-4 sm:px-6 lg:flex-row lg:px-8">
        <div className="flex items-center space-x-3 mb-6 lg:mb-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md">
            <Car className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Travel<span className="text-primary">Mate</span></span>
        </div>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-0">
          &copy; {new Date().getFullYear()} TravelMate. All rights reserved.
        </p>
        <div className="flex space-x-8">
          <Link href="#" className="text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors hover:text-primary dark:hover:text-primary">
            Terms
          </Link>
          <Link href="#" className="text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors hover:text-primary dark:hover:text-primary">
            Privacy
          </Link>
          <Link href="#" className="text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors hover:text-primary dark:hover:text-primary">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
