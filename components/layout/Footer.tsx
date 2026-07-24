import React from 'react';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[#1a2b4c] bg-[#031636] px-6 py-6 text-[#b6c6f0] sm:px-16">
      <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="text-center md:text-left">
          <p className="text-2xl font-bold uppercase tracking-tight text-[#f8f9fa]">CarHub</p>
          <p className="mt-2 text-sm">© {new Date().getFullYear()} CarHub Performance Systems. All rights reserved.</p>
        </div>

        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm">
          {['Privacy Policy', 'Terms of Service', 'Dealer Network', 'Support'].map((link) => (
            <a key={link} href="#" className="transition hover:text-white">
              {link}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
