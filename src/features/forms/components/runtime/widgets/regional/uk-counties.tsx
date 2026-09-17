'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str } from '../widget-props';

// UK constituent countries.
const COUNTRIES: { code: string; label: string }[] = [
  { code: 'GB-ENG', label: 'England' },
  { code: 'GB-SCT', label: 'Scotland' },
  { code: 'GB-WLS', label: 'Wales' },
  { code: 'GB-NIR', label: 'Northern Ireland' },
];

// Subset of ceremonial/administrative counties (representative — full set is 90+).
const COUNTIES: Record<string, { code: string; label: string }[]> = {
  'GB-ENG': [
    { code: 'BEDS', label: 'Bedfordshire' },
    { code: 'BERKS', label: 'Berkshire' },
    { code: 'BRIS', label: 'Bristol' },
    { code: 'BUCKS', label: 'Buckinghamshire' },
    { code: 'CAMBS', label: 'Cambridgeshire' },
    { code: 'CHES', label: 'Cheshire' },
    { code: 'CORN', label: 'Cornwall' },
    { code: 'CUMB', label: 'Cumbria' },
    { code: 'DERBYS', label: 'Derbyshire' },
    { code: 'DEVON', label: 'Devon' },
    { code: 'DORSET', label: 'Dorset' },
    { code: 'DURHAM', label: 'County Durham' },
    { code: 'ESSEX', label: 'Essex' },
    { code: 'GLOS', label: 'Gloucestershire' },
    { code: 'GM', label: 'Greater Manchester' },
    { code: 'HANTS', label: 'Hampshire' },
    { code: 'HERTS', label: 'Hertfordshire' },
    { code: 'KENT', label: 'Kent' },
    { code: 'LANCS', label: 'Lancashire' },
    { code: 'LEICS', label: 'Leicestershire' },
    { code: 'LON', label: 'Greater London' },
    { code: 'LINC', label: 'Lincolnshire' },
    { code: 'MERSEYSIDE', label: 'Merseyside' },
    { code: 'NORFOLK', label: 'Norfolk' },
    { code: 'NYORKS', label: 'North Yorkshire' },
    { code: 'NOTTS', label: 'Nottinghamshire' },
    { code: 'OXON', label: 'Oxfordshire' },
    { code: 'SHROPS', label: 'Shropshire' },
    { code: 'SOM', label: 'Somerset' },
    { code: 'STAFFS', label: 'Staffordshire' },
    { code: 'SUFFOLK', label: 'Suffolk' },
    { code: 'SURREY', label: 'Surrey' },
    { code: 'WARKS', label: 'Warwickshire' },
    { code: 'WMD', label: 'West Midlands' },
    { code: 'WYORKS', label: 'West Yorkshire' },
    { code: 'WILTS', label: 'Wiltshire' },
  ],
  'GB-SCT': [
    { code: 'ABERDEEN', label: 'Aberdeenshire' },
    { code: 'ARGYLL', label: 'Argyll and Bute' },
    { code: 'EDINBURGH', label: 'City of Edinburgh' },
    { code: 'GLASGOW', label: 'Glasgow City' },
    { code: 'HIGHLAND', label: 'Highland' },
    { code: 'LOTHIAN', label: 'West Lothian' },
    { code: 'FIFE', label: 'Fife' },
    { code: 'PERTH', label: 'Perth and Kinross' },
  ],
  'GB-WLS': [
    { code: 'ANGLESEY', label: 'Anglesey' },
    { code: 'CARDIFF', label: 'Cardiff' },
    { code: 'CARMARTHEN', label: 'Carmarthenshire' },
    { code: 'DENBIGH', label: 'Denbighshire' },
    { code: 'GLAMORGAN', label: 'Glamorgan' },
    { code: 'GWYNEDD', label: 'Gwynedd' },
    { code: 'PEMBROKE', label: 'Pembrokeshire' },
  ],
  'GB-NIR': [
    { code: 'ANTRIM', label: 'County Antrim' },
    { code: 'ARMAGH', label: 'County Armagh' },
    { code: 'DERRY', label: 'County Londonderry' },
    { code: 'DOWN', label: 'County Down' },
    { code: 'FERMANAGH', label: 'County Fermanagh' },
    { code: 'TYRONE', label: 'County Tyrone' },
  ],
};

export function UkCounties({ value, onChange, disabled, field }: WidgetProps) {
  const raw = typeof value === 'string' ? value : '';
  // Value format: "<countryCode>" or "<countryCode>|<countyCode>".
  const [country, county] = raw.split('|');
  const ariaLabel = str(field?.label, 'UK county');
  const counties = country ? COUNTIES[country] || [] : [];

  function commit(c: string, countyCode?: string) {
    onChange(countyCode ? `${c}|${countyCode}` : c);
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <Select value={country ?? ''} onValueChange={(c) => commit(c)} disabled={disabled}>
        <SelectTrigger aria-label={`${ariaLabel} (country)`} className="w-full">
          <SelectValue placeholder="Select country…" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>UK Countries</SelectLabel>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {country && counties.length > 0 && (
        <Select value={county ?? ''} onValueChange={(c) => commit(country, c)} disabled={disabled}>
          <SelectTrigger aria-label={`${ariaLabel} (county)`} className="w-full">
            <SelectValue placeholder="Select county…" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{COUNTRIES.find((c) => c.code === country)?.label} counties</SelectLabel>
              {counties.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export default UkCounties;
