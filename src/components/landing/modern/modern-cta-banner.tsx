'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModernCtaBannerProps {
  onGetStarted?: () => void;
  onWatchDemo?: () => void;
}

export function ModernCtaBanner({
  onGetStarted,
  onWatchDemo,
}: ModernCtaBannerProps) {
  return (
    <section className="bg-emerald-800 py-12 sm:py-16 text-white relative overflow-hidden">
      {/* Subtle radial background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/20 blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          
          {/* Left Text */}
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              Ready to grow your service business?
            </h2>
            <p className="text-sm sm:text-base text-emerald-100">
              Join thousands of service professionals who run their business with Fieseros.
            </p>
          </div>

          {/* Right Buttons */}
          <div className="flex flex-wrap items-center gap-3.5">
            <Button
              onClick={onGetStarted}
              className="bg-white hover:bg-slate-100 text-emerald-900 font-bold text-sm h-12 px-6 rounded-lg shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Start Free — 100 Jobs Included</span>
              <ArrowRight className="h-4 w-4 text-emerald-700" />
            </Button>

            <Button
              variant="outline"
              onClick={onWatchDemo}
              className="border border-emerald-600/80 bg-emerald-900/40 hover:bg-emerald-900 text-white font-semibold text-sm h-12 px-5 rounded-lg flex items-center gap-2 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-white text-white" />
              <span>Watch Demo</span>
            </Button>
          </div>

        </div>
      </div>
    </section>
  );
}
