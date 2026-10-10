'use client';

import * as React from 'react';
import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';

export function ModernFooter() {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600 pt-12 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Top Grid */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-slate-100">
          
          {/* Brand Info (4 cols) */}
          <div className="col-span-2 md:col-span-4 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandMark size={30} />
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Fieseros
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xs leading-relaxed">
              The operating system for service businesses.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2 text-slate-400">
              <a
                href="https://facebook.com/fieseros"
                target="_blank"
                rel="noopener noreferrer"
                className="size-8 rounded-full bg-slate-50 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                </svg>
              </a>
              <a
                href="https://instagram.com/fieseros"
                target="_blank"
                rel="noopener noreferrer"
                className="size-8 rounded-full bg-slate-50 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com/company/fieseros"
                target="_blank"
                rel="noopener noreferrer"
                className="size-8 rounded-full bg-slate-50 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a
                href="https://youtube.com/@fieseros"
                target="_blank"
                rel="noopener noreferrer"
                className="size-8 rounded-full bg-slate-50 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center transition-colors"
                aria-label="YouTube"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product (2 cols) */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Product</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/customer-crm" className="hover:text-emerald-700 transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/ai-employee" className="hover:text-emerald-700 transition-colors">
                  AI Employee
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-emerald-700 transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <a href="#pricing" className="hover:text-emerald-700 transition-colors">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Solutions (2 cols) */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Solutions</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/plumbing-software" className="hover:text-emerald-700 transition-colors">
                  Plumbing
                </Link>
              </li>
              <li>
                <Link href="/hvac-software" className="hover:text-emerald-700 transition-colors">
                  HVAC
                </Link>
              </li>
              <li>
                <Link href="/electrical-contractor-software" className="hover:text-emerald-700 transition-colors">
                  Electrical
                </Link>
              </li>
              <li>
                <Link href="/cleaning-software" className="hover:text-emerald-700 transition-colors">
                  Cleaning
                </Link>
              </li>
              <li>
                <Link href="/solutions/home_services" className="hover:text-emerald-700 transition-colors">
                  All Industries
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources (2 cols) */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Resources</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/contact-us" className="hover:text-emerald-700 transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-emerald-700 transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/why-fieseros" className="hover:text-emerald-700 transition-colors">
                  Case Studies
                </Link>
              </li>
              <li>
                <Link href="/tools" className="hover:text-emerald-700 transition-colors">
                  API
                </Link>
              </li>
              <li>
                <Link href="/why-fieseros" className="hover:text-emerald-700 transition-colors">
                  Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Company (2 cols) */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Company</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/why-fieseros" className="hover:text-emerald-700 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/partners" className="hover:text-emerald-700 transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/contact-us" className="hover:text-emerald-700 transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="hover:text-emerald-700 transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-emerald-700 transition-colors">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Fieseros Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-slate-600 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="hover:text-slate-600 transition-colors">
              Terms of Service
            </Link>
            <Link href="/cookie-policy" className="hover:text-slate-600 transition-colors">
              Cookies
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
