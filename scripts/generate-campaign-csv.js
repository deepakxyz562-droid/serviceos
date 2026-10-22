const fs = require('fs');

const headers = [
  'Campaign',
  'Budget',
  'Budget type',
  'EU political ads',
  'Campaign type',
  'Networks',
  'Languages',
  'Bid Strategy Type',
  'Location',
  'Campaign status',
  'Ad Group',
  'Ad Group status',
  'Max CPC',
  'Keyword',
  'Criterion Type',
  'Ad type',
  'Headline 1',
  'Headline 2',
  'Headline 3',
  'Headline 4',
  'Headline 5',
  'Headline 6',
  'Headline 7',
  'Headline 8',
  'Headline 9',
  'Headline 10',
  'Headline 11',
  'Headline 12',
  'Headline 13',
  'Headline 14',
  'Headline 15',
  'Description 1',
  'Description 2',
  'Description 3',
  'Description 4',
  'Path 1',
  'Path 2',
  'Final URL'
];

function formatRow(obj) {
  return headers.map(h => {
    const val = obj[h] !== undefined ? String(obj[h]) : '';
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return '"' + val.replace(/"/g, '""') + '"';
    }
    return val;
  }).join(',');
}

const cName = 'Search - AU - Tradies & AI Receptionist';
const rows = [];

// 1. Campaign row
rows.push(formatRow({
  'Campaign': cName,
  'Budget': '1000',
  'Budget type': 'Daily',
  'EU political ads': 'No',
  'Campaign type': 'Search',
  'Networks': 'Google search',
  'Languages': 'en',
  'Bid Strategy Type': 'Maximize Clicks',
  'Location': 'Australia',
  'Campaign status': 'Enabled'
}));

// 2. Ad Groups
const adGroups = ['AI Receptionist Tradies AU', 'Field Service Software AU'];
for (const ag of adGroups) {
  rows.push(formatRow({
    'Campaign': cName,
    'Ad Group': ag,
    'Ad Group status': 'Enabled',
    'Max CPC': '120'
  }));
}

// 3. Positive Keywords
const aiKeywords = [
  { kw: '[ai receptionist for tradies]', type: 'Exact' },
  { kw: 'ai receptionist for tradies', type: 'Phrase' },
  { kw: '[tradie phone answering service]', type: 'Exact' },
  { kw: 'tradie phone answering service', type: 'Phrase' },
  { kw: '[virtual receptionist for tradies australia]', type: 'Exact' },
  { kw: 'virtual receptionist for tradies australia', type: 'Phrase' },
  { kw: '[ai call answering plumbers]', type: 'Exact' },
  { kw: 'ai call answering plumbers', type: 'Phrase' },
  { kw: '[ai phone answering electricians]', type: 'Exact' },
  { kw: 'ai phone answering electricians', type: 'Phrase' },
  { kw: '[after hours tradie answering service]', type: 'Exact' },
  { kw: 'after hours tradie answering service', type: 'Phrase' },
  { kw: '[automated phone answering tradies]', type: 'Exact' },
  { kw: 'automated phone answering tradies', type: 'Phrase' },
  { kw: '[plumber answering service australia]', type: 'Exact' },
  { kw: 'plumber answering service australia', type: 'Phrase' }
];

for (const k of aiKeywords) {
  rows.push(formatRow({
    'Campaign': cName,
    'Ad Group': 'AI Receptionist Tradies AU',
    'Keyword': k.kw,
    'Criterion Type': k.type
  }));
}

const fsmKeywords = [
  { kw: '[tradie software australia]', type: 'Exact' },
  { kw: 'tradie software australia', type: 'Phrase' },
  { kw: '[field service management software au]', type: 'Exact' },
  { kw: 'field service management software au', type: 'Phrase' },
  { kw: '[plumber quoting software australia]', type: 'Exact' },
  { kw: 'plumber quoting software australia', type: 'Phrase' },
  { kw: '[electrician invoice app australia]', type: 'Exact' },
  { kw: 'electrician invoice app australia', type: 'Phrase' },
  { kw: '[servicem8 alternative]', type: 'Exact' },
  { kw: 'servicem8 alternative', type: 'Phrase' },
  { kw: '[jobber alternative australia]', type: 'Exact' },
  { kw: 'jobber alternative australia', type: 'Phrase' },
  { kw: '[tradify alternative]', type: 'Exact' },
  { kw: 'tradify alternative', type: 'Phrase' },
  { kw: '[job management software for australian tradies]', type: 'Exact' },
  { kw: 'job management software for australian tradies', type: 'Phrase' },
  { kw: '[hvac job management software australia]', type: 'Exact' },
  { kw: 'hvac job management software australia', type: 'Phrase' },
  { kw: '[landscaping invoice software australia]', type: 'Exact' },
  { kw: 'landscaping invoice software australia', type: 'Phrase' }
];

for (const k of fsmKeywords) {
  rows.push(formatRow({
    'Campaign': cName,
    'Ad Group': 'Field Service Software AU',
    'Keyword': k.kw,
    'Criterion Type': k.type
  }));
}

// 4. Responsive Search Ads (with Ad type explicitly set)
rows.push(formatRow({
  'Campaign': cName,
  'Ad Group': 'AI Receptionist Tradies AU',
  'Ad type': 'Responsive search ad',
  'Headline 1': '24/7 AI Receptionist Tradies',
  'Headline 2': 'Never Miss Another Call',
  'Headline 3': 'Aussie Accent Call Answering',
  'Headline 4': 'Quotes & Books Into Calendar',
  'Headline 5': 'Built For Australian Tradies',
  'Headline 6': 'Answers While On The Tools',
  'Headline 7': 'Takes After-Hours Calls',
  'Headline 8': '100% ATO & GST Compliant',
  'Headline 9': 'Integrates With Xero & MYOB',
  'Headline 10': 'Plumbers, Sparkies & HVAC',
  'Headline 11': 'Try Free 14-Day Live Demo',
  'Headline 12': 'Zero Setup Fee • No Contract',
  'Headline 13': 'Save 10+ Hours Every Week',
  'Headline 14': 'Answers When In A Van',
  'Headline 15': 'Field Service AI Platform',
  'Description 1': 'Answer calls, qualify emergencies, and quote jobs while on the tools.',
  'Description 2': 'Trained on Aussie trade terms. Books appointments directly to your board.',
  'Description 3': 'Never lose another A$2,000+ job quote to voicemail. Try the live demo today.',
  'Description 4': 'Works 24/7 with 0% platform commission on payments. Built for Aussie tradies.',
  'Path 1': 'Tradie-AI',
  'Path 2': 'Demo',
  'Final URL': 'https://fieseros.com/au?utm_source=google&utm_medium=cpc&utm_campaign=ai_receptionist_tradies'
}));

rows.push(formatRow({
  'Campaign': cName,
  'Ad Group': 'Field Service Software AU',
  'Ad type': 'Responsive search ad',
  'Headline 1': 'Australian Tradie Software',
  'Headline 2': 'Quotes, Invoices & Schedules',
  'Headline 3': '100% ATO & GST Compliant',
  'Headline 4': 'Connect Office & Field Crew',
  'Headline 5': 'Integrates With Xero & MYOB',
  'Headline 6': 'Offline Mobile App On Site',
  'Headline 7': 'Top ServiceM8 Alternative',
  'Headline 8': 'Top Jobber Alternative AU',
  'Headline 9': 'Instant 1-Tap Quoting',
  'Headline 10': 'Fast Tap-To-Pay In Field',
  'Headline 11': 'Save 10+ Hours Admin Weekly',
  'Headline 12': 'Try Free 14-Day Demo',
  'Headline 13': 'Built For Aussie Tradies',
  'Headline 14': 'Drag & Drop Job Dispatch',
  'Headline 15': 'Smart Suburb Route Mapping',
  'Description 1': 'Manage quotes, jobs, schedules and invoices on the road or in the office.',
  'Description 2': 'Job sheets convert in one tap to ATO-compliant tax invoices with 10% GST.',
  'Description 3': 'Native 2-way sync with Xero & MYOB. Keep your crew and dispatch in sync.',
  'Description 4': '0% commission on payments. Built for plumbers, sparkies, HVAC & cleaners.',
  'Path 1': 'Tradie-Software',
  'Path 2': 'Australia',
  'Final URL': 'https://fieseros.com/au?utm_source=google&utm_medium=cpc&utm_campaign=tradie_software_au'
}));

const fullCsv = headers.join(',') + '\n' + rows.join('\n');
fs.writeFileSync('google-ads-campaign-au-tradies.csv', fullCsv);
fs.writeFileSync('/Users/deepakchandra/Downloads/google-ads-campaign-au-tradies.csv', fullCsv);
console.log('Main campaign CSV generated with ' + rows.length + ' rows.');

// 5. Dedicated Negative Keywords CSV in standard Google Ads format
const negHeaders = ['Campaign', 'Negative Keyword', 'Match Type'];
const negativeTerms = [
  'free', 'crack', 'download', 'login', 'jobs', 'hiring', 'tafe', 'course',
  'apprenticeship', 'salary', 'wage', 'bunnings', 'mitre 10', 'gumtree',
  'radio', 'diy plumbing', 'emergency plumber near me', 'emergency electrician near me'
];
const negRows = negativeTerms.map(term => cName + ',' + term + ',Phrase');
const negCsv = negHeaders.join(',') + '\n' + negRows.join('\n');
fs.writeFileSync('google-ads-negative-keywords-au-tradies.csv', negCsv);
fs.writeFileSync('/Users/deepakchandra/Downloads/google-ads-negative-keywords-au-tradies.csv', negCsv);
console.log('Negative keywords CSV generated with ' + negRows.length + ' rows.');
