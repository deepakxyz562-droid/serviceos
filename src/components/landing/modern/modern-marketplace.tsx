'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Star,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const pros = [
  {
    name: 'Green Valley Plumbing',
    image: '/images/landing/persona-technician.png',
    rating: '4.9',
    reviews: '124 reviews',
    location: 'Gurugram, Haryana',
    experience: 'Verified • 5+ years',
    price: '₹350',
    slug: '/business/green-valley-plumbing',
  },
  {
    name: 'Prime HVAC Solutions',
    image: '/images/landing/persona-owner.png',
    rating: '4.8',
    reviews: '89 reviews',
    location: 'Gurugram, Haryana',
    experience: 'Verified • 8+ years',
    price: '₹420',
    slug: '/business/prime-hvac-solutions',
  },
  {
    name: 'Sharma Electrical',
    image: '/images/landing/persona-dispatcher.png',
    rating: '4.7',
    reviews: '102 reviews',
    location: 'Gurugram, Haryana',
    experience: 'Verified • 6+ years',
    price: '₹495',
    slug: '/business/sharma-electrical',
  },
];

export function ModernMarketplace() {
  return (
    <section className="py-16 sm:py-24 bg-white border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* ── Left Column: Headline & CTA ── */}
          <div className="lg:col-span-4 space-y-5">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.18]">
              Find trusted local pros. <br />
              Compare up to 3 quotes.
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Post your service request and get competitive quotes from verified professionals in your area. No upfront lead fee.
            </p>

            <div className="pt-2">
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-12 px-6 rounded-lg shadow-sm">
                <Link href="/marketplace" className="flex items-center gap-2">
                  <span>Explore Marketplace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* ── Right Column: 3 Verified Pro Cards ── */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {pros.map((pro) => (
                <div
                  key={pro.name}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Pro Photo with Verified Badge */}
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100">
                      <Image
                        src={pro.image}
                        alt={pro.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white size-6 rounded-full flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="size-4" />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{pro.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-amber-500 mt-1">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-slate-800">{pro.rating}</span>
                        <span className="text-slate-400 text-[11px]">({pro.reviews})</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="size-3 text-slate-400" />
                        <span>{pro.location}</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-700 font-medium">
                        <ShieldCheck className="size-3 text-emerald-600" />
                        <span>{pro.experience}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-base font-extrabold text-slate-900">{pro.price}</span>
                      <span className="text-[10px] text-slate-400 block">starting price</span>
                    </div>
                    <Link
                      href="/request"
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                    >
                      View Quote
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
