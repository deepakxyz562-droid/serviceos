'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const industries = [
  {
    name: 'Plumbing',
    image: '/images/industry/plumbing.webp',
    href: '/plumbing-software',
  },
  {
    name: 'HVAC',
    image: '/images/industry/hvac.webp',
    href: '/hvac-software',
  },
  {
    name: 'Electrical',
    image: '/images/industry/electrical.webp',
    href: '/electrical-contractor-software',
  },
  {
    name: 'Cleaning',
    image: '/images/industry/cleaning.webp',
    href: '/cleaning-software',
  },
  {
    name: 'Landscaping',
    image: '/images/industry/landscaping.webp',
    href: '/landscaping-software',
  },
  {
    name: 'Handyman',
    image: '/images/industry/painting.webp',
    href: '/handyman-software',
  },
  {
    name: 'Roofing',
    image: '/images/industry/roofing.webp',
    href: '/roofing-software',
  },
  {
    name: 'Pet Care',
    image: '/images/industry/pet.webp',
    href: '/pet-services-software',
  },
];

export function ModernIndustries() {
  return (
    <section className="py-16 sm:py-20 bg-white border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Popular Industries
          </h2>
          <p className="mt-1 text-sm sm:text-base text-slate-500">
            Built for all service and trade businesses
          </p>
        </div>

        {/* 8-Card Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
          {industries.map((ind) => (
            <Link
              key={ind.name}
              href={ind.href}
              className="group flex flex-col items-center p-2 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-md hover:border-emerald-500 border border-slate-200/80 transition-all duration-200 text-center"
            >
              <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2.5 bg-slate-200">
                <Image
                  src={ind.image}
                  alt={`${ind.name} contractor software`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 12vw"
                  className="object-cover group-hover:scale-108 transition-transform duration-300"
                />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors pb-1">
                {ind.name}
              </span>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
