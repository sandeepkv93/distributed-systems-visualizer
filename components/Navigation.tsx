'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import ProgressDashboard from './ProgressDashboard';
import { TrendingUp } from 'lucide-react';
import { CONCEPTS_CATALOG } from '@/lib/catalog';

const navTopics = CONCEPTS_CATALOG.map((concept) => ({
  name: concept.navName,
  path: concept.path,
}));

const mobileLinks = [{ name: 'Home', path: '/' }, ...navTopics];

export default function Navigation() {
  const pathname = usePathname();
  const [showProgressDashboard, setShowProgressDashboard] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDesktopMore, setShowDesktopMore] = useState(false);

  return (
    <>
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/"
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  pathname === '/'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Home
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDesktopMore((open) => !open)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Topics
                </button>
                {showDesktopMore && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowDesktopMore(false)}
                    />
                    <div className="absolute left-0 mt-2 w-60 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
                      <div className="py-2 max-h-80 overflow-y-auto">
                        {navTopics.map((concept) => {
                          const isActive = pathname === concept.path;
                          return (
                            <Link
                              key={`topic-${concept.path}`}
                              href={concept.path}
                              onClick={() => setShowDesktopMore(false)}
                              className={`block px-4 py-2 text-sm transition-colors ${
                                isActive
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                              }`}
                            >
                              {concept.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setShowMobileMenu((open) => !open)}
                className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600"
              >
                Topics
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowProgressDashboard(true)}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                <TrendingUp className="w-4 h-4" />
                Progress
              </button>
            </div>
          </div>
        </div>
      </nav>
      {showMobileMenu && (
        <div className="md:hidden bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap gap-2">
            {mobileLinks.map((concept) => {
              const isActive = pathname === concept.path;
              return (
                <Link
                  key={`mobile-${concept.path}`}
                  href={concept.path}
                  onClick={() => setShowMobileMenu(false)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {concept.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress Dashboard */}
      {showProgressDashboard && <ProgressDashboard onClose={() => setShowProgressDashboard(false)} />}
    </>
  );
}
