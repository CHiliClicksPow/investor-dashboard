import * as XLSX from 'xlsx';

export interface InvestorRecord {
  investor_name: string;
  contact_name?: string | null;
  title?: string | null;
  type?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  linkedin?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  year_founded?: number | null;
  min_investment?: number | null;
  max_investment?: number | null;
  stages?: string | null;
  asset_class?: string | null;
  industry_focus?: string | null;
  geographic_focus?: string | null;
  requirements?: string | null;
  description?: string | null;
  portfolio_companies?: string | null;
  source_sheets: string[];
  raw_data?: any;
}

function s(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function cleanEmail(v: any): string {
  const val = s(v).toLowerCase();
  if (!val || !val.includes('@')) return '';
  return val.split(',')[0].trim();
}

function num(v: any): number | null {
  const f = parseFloat(v);
  return isNaN(f) ? null : f;
}

function rowsOf(ws: XLSX.WorkSheet): any[][] {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][];
}

function findSheet(wb: XLSX.WorkBook, matcher: (name: string) => boolean): string | undefined {
  return wb.SheetNames.find(matcher);
}

/**
 * Parses the whole workbook into a flat list of raw records (one per row,
 * not yet deduplicated). Mirrors the sheet-by-sheet mapping worked out
 * against the original file.
 */
export function parseWorkbook(buffer: ArrayBuffer): InvestorRecord[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const out: InvestorRecord[] = [];

  const handledSheets = new Set<string>();
  const push = (rec: Partial<InvestorRecord>, sheet: string) => {
    handledSheets.add(sheet);
    if (!rec.investor_name) return;
    out.push({ source_sheets: [sheet], ...rec } as InvestorRecord);
  };

  // --- Investors Group Whatsapp ---
  const whatsappSheet = findSheet(wb, (n) => n === 'Investors Group Whatsapp');
  if (whatsappSheet) {
    const rows = rowsOf(wb.Sheets[whatsappSheet]).slice(2);
    for (const r of rows) {
      const [name, position, fund, thesis, sectors, linkedin, mail, contact] = r;
      if (!s(name) && !s(fund)) continue;
      push(
        {
          investor_name: s(fund) || s(name),
          contact_name: s(name),
          title: s(position),
          email: cleanEmail(mail),
          phone: s(contact),
          linkedin: s(linkedin),
          description: s(thesis) || null,
          industry_focus: s(sectors) || null,
          type: 'Angel/Individual',
        },
        whatsappSheet
      );
    }
  }

  // --- Scraped contact sheets: India, UAE, UAE 2, US, India 2 ---
  const scrapedMap: Record<string, Record<string, number>> = {
    India: { fn: 1, ln: 2, title: 3, company: 4, email: 5, phone: 7, industry: 10, plink: 12, website: 13, city: 15, country: 17 },
    UAE: { fn: 1, ln: 2, title: 3, company: 4, email: 5, phone: 8, industry: 10, plink: 12, website: 13, country: 15 },
    'UAE 2': { fn: 1, ln: 2, title: 3, company: 4, email: 5, phone: 8, industry: 10, plink: 12, website: 13, country: 15 },
    US: { fn: 1, ln: 2, title: 3, company: 4, email: 5, phone: 6, industry: 8, plink: 9, website: 10, city: 12, country: 14 },
    'India 2': { fn: 1, ln: 2, title: 3, company: 5, email: 6, phone: 7, industry: 9, plink: 10, website: 11, city: 13 },
  };
  for (const [sheetName, m] of Object.entries(scrapedMap)) {
    const found = findSheet(wb, (n) => n === sheetName);
    if (!found) continue;
    const rows = rowsOf(wb.Sheets[found]).slice(1);
    for (const r of rows) {
      const g = (k: string) => (m[k] !== undefined ? r[m[k]] : null);
      const fn = s(g('fn'));
      const ln = s(g('ln'));
      const company = s(g('company'));
      if (!company && !fn) continue;
      push(
        {
          investor_name: company || `${fn} ${ln}`.trim(),
          contact_name: `${fn} ${ln}`.trim(),
          title: s(g('title')),
          email: cleanEmail(g('email')),
          phone: s(g('phone')),
          linkedin: s(g('plink')),
          website: s(g('website')),
          city: s(g('city')),
          country: s(g('country')),
          industry_focus: s(g('industry')) || null,
          type: 'VC/PE Contact (scraped)',
        },
        found
      );
    }
  }

  // --- Sheet9 (curated small list) ---
  const sheet9 = findSheet(wb, (n) => n === 'Sheet9');
  if (sheet9) {
    const rows = rowsOf(wb.Sheets[sheet9]).slice(1);
    for (const r of rows) {
      const [, company, poc, email, mobile, sector, ticket, geo, comments] = r;
      if (!s(company)) continue;
      push(
        {
          investor_name: s(company),
          contact_name: s(poc),
          email: cleanEmail(email),
          phone: s(mobile),
          industry_focus: s(sector) || null,
          requirements: s(ticket) || null,
          geographic_focus: s(geo) || null,
          description: s(comments) || null,
          type: 'Curated',
        },
        sheet9
      );
    }
  }

  // --- Investor Update (CRM tracker) ---
  const invUpdate = findSheet(wb, (n) => n === 'Investor Update');
  if (invUpdate) {
    const rows = rowsOf(wb.Sheets[invUpdate]).slice(1);
    for (const r of rows) {
      const [, , name, poc, title, phone, email, linkedin, , , sector, subcat, ticket, geo, comments] = r;
      if (!s(name)) continue;
      push(
        {
          investor_name: s(name),
          contact_name: s(poc),
          title: s(title),
          phone: s(phone),
          email: cleanEmail(email),
          linkedin: s(linkedin),
          industry_focus: [s(sector), s(subcat)].filter(Boolean).join(', ') || null,
          requirements: s(ticket) || null,
          geographic_focus: s(geo) || null,
          description: s(comments) || null,
          type: 'Tracked (CRM)',
        },
        invUpdate
      );
    }
  }

  // --- Indian and Foriegn VC / VC2 ---
  for (const [sheetName, hasGap] of [
    ['Indian and Foriegn VC', false],
    ['Indian and Foreign VC2', true],
  ] as [string, boolean][]) {
    const found = findSheet(wb, (n) => n === sheetName);
    if (!found) continue;
    const rows = rowsOf(wb.Sheets[found]).slice(1);
    for (const r of rows) {
      const cname = hasGap ? s(r[1]) : s(r[1]);
      const company = hasGap ? s(r[3]) : null;
      const title = hasGap ? s(r[2]) : s(r[2]);
      const phone = hasGap ? s(r[4]) : s(r[3]);
      const email = hasGap ? s(r[5]) : s(r[4]);
      const loc = hasGap ? s(r[6]) : s(r[5]);
      const website = hasGap ? s(r[7]) : s(r[6]);
      const linkedin = hasGap ? s(r[8]) : s(r[7]);
      if (!cname) continue;
      let city = '', country = '';
      if (loc.includes(',')) {
        const parts = loc.split(',').map((p) => p.trim());
        country = parts[parts.length - 1];
        city = parts[0];
      }
      push(
        {
          investor_name: company || cname,
          contact_name: cname,
          title,
          phone,
          email: cleanEmail(email),
          website,
          linkedin,
          city,
          country,
          type: 'VC Contact',
        },
        found
      );
    }
  }

  // --- TOP VC ---
  const topVc = findSheet(wb, (n) => n === 'TOP VC');
  if (topVc) {
    const rows = rowsOf(wb.Sheets[topVc]).slice(1);
    for (const r of rows) {
      const [, firm, email, website] = r;
      if (!s(firm)) continue;
      push({ investor_name: s(firm), email: cleanEmail(email), website: s(website), type: 'Top VC' }, topVc);
    }
  }

  // --- Angels ---
  const angels = findSheet(wb, (n) => n === 'Angels');
  if (angels) {
    const rows = rowsOf(wb.Sheets[angels]).slice(1);
    for (const r of rows) {
      const [, fullname, title, company, phone, email, loc, website, linkedin] = r;
      if (!s(fullname)) continue;
      let city = '', country = '';
      const locS = s(loc);
      if (locS.includes(',')) {
        const parts = locS.split(',').map((p) => p.trim());
        country = parts[parts.length - 1];
        city = parts[0];
      }
      push(
        {
          investor_name: s(company) || s(fullname),
          contact_name: s(fullname),
          title: s(title),
          phone: s(phone),
          email: cleanEmail(email),
          website: s(website),
          linkedin: s(linkedin),
          city,
          country,
          type: 'Angel',
        },
        angels
      );
    }
  }

  // --- AYUSHS INVESTORS LIST (IPO) ---
  const ipoList = findSheet(wb, (n) => n.trim().startsWith('AYUSHS INVESTORS LIST'));
  if (ipoList) {
    const rows = rowsOf(wb.Sheets[ipoList]).slice(2);
    for (const r of rows) {
      const [name, position, fund, thesis, , , , contact] = r;
      if (!s(name) && !s(fund)) continue;
      push(
        {
          investor_name: s(fund) || s(name),
          contact_name: s(name),
          title: s(position),
          description: s(thesis) || null,
          phone: s(contact),
          type: 'IPO/Pre-IPO',
        },
        ipoList
      );
    }
  }

  // --- ACTIVE IPO INVESTORS ---
  const activeIpo = findSheet(wb, (n) => n === 'ACTIVE IPO INVESTORS');
  if (activeIpo) {
    const rows = rowsOf(wb.Sheets[activeIpo]).slice(2);
    for (const r of rows) {
      const [name, contact, fund, avgIssue, avgPe] = r;
      if (!s(fund) && !s(name)) continue;
      push(
        {
          investor_name: s(fund) || s(name),
          contact_name: s(name),
          phone: s(contact),
          requirements: `Avg Issue Amount (Rs.cr.): ${s(avgIssue)}, Avg P/E: ${s(avgPe)}`,
          type: 'Active IPO Investor',
        },
        activeIpo
      );
    }
  }

  // --- THE BIG ONE: 24,345 Startup Investors (Global) ---
  const bigSheet = findSheet(wb, (n) => n.startsWith('24,345 Startup Investors'));
  if (bigSheet) {
    const rows = rowsOf(wb.Sheets[bigSheet]).slice(1);
    for (const r of rows) {
      const [
        , investor, itype, address, city, country, website, linkedin, email, phone,
        desc, yearf, minv, maxv, stages, assetclass, indfocus, geofocus, reqs, portfolio,
      ] = r;
      if (!s(investor)) continue;
      push(
        {
          investor_name: s(investor),
          type: s(itype) || 'VC/PE (Global DB)',
          address: s(address),
          city: s(city),
          country: s(country),
          website: s(website),
          linkedin: s(linkedin),
          email: cleanEmail(email),
          phone: s(phone),
          description: s(desc) || null,
          year_founded: typeof yearf === 'number' ? yearf : null,
          min_investment: num(minv),
          max_investment: num(maxv),
          stages: s(stages) || null,
          asset_class: s(assetclass) || null,
          industry_focus: s(indfocus) || null,
          geographic_focus: s(geofocus) || null,
          requirements: s(reqs) || null,
          portfolio_companies: s(portfolio) || null,
        },
        bigSheet
      );
    }
  }

  // --- Generic fallback: any sheet not already handled above, matched by
  // recognizable column headers (e.g. a simple new sheet with columns like
  // "Investor", "Sector", "City", "Country", "Website", "LinkedIn", "Contact Email"). ---
  const normalizeHeader = (h: any) => s(h).toLowerCase().replace(/[^a-z0-9]/g, '');
  const HEADER_MAP: Record<string, keyof InvestorRecord> = {
    investor: 'investor_name', investorname: 'investor_name', investorfundname: 'investor_name',
    fundname: 'investor_name', fund: 'investor_name', name: 'investor_name', company: 'investor_name',
    contactname: 'contact_name', contact: 'contact_name', poc: 'contact_name',
    type: 'type', investortype: 'type',
    sector: 'industry_focus', sectors: 'industry_focus', industry: 'industry_focus', industryfocus: 'industry_focus',
    stage: 'stages', stages: 'stages',
    city: 'city', country: 'country',
    website: 'website', linkedin: 'linkedin',
    contactemail: 'email', email: 'email', emailid: 'email',
    phone: 'phone', contactphone: 'phone', mobilenumber: 'phone', phonenumber: 'phone',
    mininvestment: 'min_investment', minticket: 'min_investment', minticketsize: 'min_investment',
    maxinvestment: 'max_investment', maxticket: 'max_investment', maxticketsize: 'max_investment', ticketsize: 'max_investment',
    geography: 'geographic_focus', geographicfocus: 'geographic_focus', geographyfocus: 'geographic_focus',
    requirements: 'requirements', description: 'description', notes: 'description', thesis: 'description',
    investmentthesis: 'description', comments: 'description', anycomments: 'description',
    portfoliocompanies: 'portfolio_companies',
  };

  for (const sheetName of wb.SheetNames) {
    if (handledSheets.has(sheetName)) continue;
    const rows = rowsOf(wb.Sheets[sheetName]);
    if (!rows.length) continue;

    const headerRow = rows[0] || [];
    const colMap: Partial<Record<keyof InvestorRecord, number>> = {};
    headerRow.forEach((h: any, idx: number) => {
      const field = HEADER_MAP[normalizeHeader(h)];
      if (field && colMap[field] === undefined) colMap[field] = idx;
    });
    if (colMap.investor_name === undefined) continue; // doesn't look like an investor sheet — skip silently

    for (const r of rows.slice(1)) {
      if (!r || !r.some((c: any) => c !== null && c !== '')) continue;
      const get = (field: keyof InvestorRecord) => {
        const idx = colMap[field];
        return idx !== undefined ? r[idx] : null;
      };
      const name = s(get('investor_name'));
      if (!name) continue;
      push(
        {
          investor_name: name,
          contact_name: s(get('contact_name')) || null,
          type: s(get('type')) || null,
          industry_focus: s(get('industry_focus')) || null,
          stages: s(get('stages')) || null,
          city: s(get('city')) || null,
          country: s(get('country')) || null,
          website: s(get('website')) || null,
          linkedin: s(get('linkedin')) || null,
          email: cleanEmail(get('email')) || null,
          phone: s(get('phone')) || null,
          min_investment: num(get('min_investment')),
          max_investment: num(get('max_investment')),
          geographic_focus: s(get('geographic_focus')) || null,
          requirements: s(get('requirements')) || null,
          description: s(get('description')) || null,
          portfolio_companies: s(get('portfolio_companies')) || null,
        },
        sheetName
      );
    }
  }

  return out;
}

const FIELDS: (keyof InvestorRecord)[] = [
  'investor_name', 'contact_name', 'title', 'type', 'email', 'phone', 'website',
  'linkedin', 'address', 'city', 'country', 'year_founded', 'min_investment',
  'max_investment', 'stages', 'asset_class', 'industry_focus', 'geographic_focus',
  'requirements', 'description', 'portfolio_companies',
];

// Sheets whose structured fields should win when the same investor
// (by email) shows up in more than one sheet.
const SHEET_PRIORITY: Record<string, number> = {
  'Investor Update': 1,
  Sheet9: 2,
  'Investors Group Whatsapp': 3,
};
function priority(sheet: string) {
  return SHEET_PRIORITY[sheet] ?? (sheet.startsWith('24,345') ? 0 : 10);
}

/** Deduplicates by email (or by name pair when no email is present). */
export function dedupeRecords(records: InvestorRecord[]): InvestorRecord[] {
  const byEmail = new Map<string, InvestorRecord & { _prio: number }>();
  const byName = new Map<string, InvestorRecord>();

  for (const rec of records) {
    const email = (rec.email || '').toLowerCase().trim();
    const prio = priority(rec.source_sheets[0]);

    if (email) {
      const existing = byEmail.get(email);
      if (!existing) {
        byEmail.set(email, { ...rec, email, _prio: prio });
      } else {
        existing.source_sheets = Array.from(new Set([...existing.source_sheets, ...rec.source_sheets]));
        for (const f of FIELDS) {
          const val = rec[f];
          if (val === null || val === undefined || val === '') continue;
          const cur = existing[f];
          if (cur === null || cur === undefined || cur === '' || prio < existing._prio) {
            (existing as any)[f] = val;
          }
        }
        existing._prio = Math.min(existing._prio, prio);
      }
    } else {
      const key = `${(rec.investor_name || '').toLowerCase()}|${(rec.contact_name || '').toLowerCase()}`;
      const existing = byName.get(key);
      if (!existing) {
        byName.set(key, { ...rec });
      } else {
        existing.source_sheets = Array.from(new Set([...existing.source_sheets, ...rec.source_sheets]));
        for (const f of FIELDS) {
          const val = rec[f];
          if ((val !== null && val !== undefined && val !== '') && !existing[f]) {
            (existing as any)[f] = val;
          }
        }
      }
    }
  }

  const result: InvestorRecord[] = [];
  for (const v of byEmail.values()) {
    const { _prio, ...rest } = v;
    result.push(rest);
  }
  result.push(...byName.values());
  return result;
}
