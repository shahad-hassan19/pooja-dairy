import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { useShop } from '../contexts/useShop';
import type { Item } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { Callout, Page } from '../components/ui/Page';
import { Table, TableWrap, Td, Th } from '../components/ui/Table';
import { cx } from '../lib/cx';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
} from 'recharts';

/* ── Types ── */

interface ShopSummary {
  shopId: string; shopName: string; location: string | null; type: string;
  revenue: number; invoices: number; prevRevenue: number; prevInvoices: number;
  delta: number; totalStock: number; itemCount: number; period: string;
}

type TrendByShop = Record<string, Record<string, number>>;
type Period = 'today' | 'weekly' | 'monthly' | 'yearly';

interface ReconRow {
  itemId: string; itemName: string; price: number;
  stockIn: number; invoicedSold: number; saleDeductions: number;
  transferOut: number; otherLoss: number; currentStock: number;
  unaccounted: number; flag: 'ok' | 'warning' | 'critical';
}

interface IntelligenceData {
  topSellers: { itemId: string; itemName: string; totalSold: number; revenue: number; pctOfTotal: number }[];
  frequentDispatches: { itemId: string; itemName: string; dispatchCount: number; totalQty: number }[];
  reconciliation: ReconRow[];
  peakHours: { label: string; orders: number; revenue: number }[];
  peakDays: { day: string; count: number; revenue: number }[];
  summary: { totalItems: number; totalStock: number; flaggedItems: number; totalVarianceValue: number };
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' }, { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' }, { key: 'yearly', label: 'Yearly' },
];

/* ── Helpers ── */

function fmtCurrency(val: number) {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val.toFixed(0)}`;
}

function prevPeriodLabel(p: string) {
  switch (p) {
    case 'weekly': return 'vs last week'; case 'monthly': return 'vs last month';
    case 'yearly': return 'vs last year'; default: return 'vs yesterday';
  }
}

function formatXLabel(key: string, period: Period): string {
  switch (period) {
    case 'today': {
      const h = parseInt(key.split(':')[0], 10);
      return h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;
    }
    case 'weekly': return new Date(key + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' });
    case 'monthly': { const d = parseInt(key.split('-')[2], 10); return d === 1 || d % 7 === 0 ? `${d}` : ''; }
    case 'yearly': {
      const m = parseInt(key.split('-')[1], 10) - 1;
      return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m];
    }
  }
}

/* ── Delta badge ── */
function DeltaBadge({ delta, label }: { delta: number; label: string }) {
  const isUp = delta > 0; const isZero = delta === 0;
  return (
    <div className="flex items-center gap-1">
      <span className={cx('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
        isZero ? 'bg-ink/5 text-ink/40' : isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')}>
        {!isZero && <svg viewBox="0 0 10 10" className={cx('h-2.5 w-2.5', !isUp && 'rotate-180')}><path d="M5 2L9 7H1L5 2Z" fill="currentColor" /></svg>}
        {isZero ? '0%' : `${Math.abs(delta)}%`}
      </span>
      <span className="text-[9px] text-ink/35">{label}</span>
    </div>
  );
}

/* ── Recharts trend chart ── */
function fmtYAxis(val: number) {
  if (val >= 100000) return `${(val / 100000).toFixed(0)}L`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return `${val}`;
}

function TrendChart({ data, period, height = 140 }: { data: Record<string, number>; period: Period; height?: number }) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    key, label: formatXLabel(key, period), value,
  }));
  if (chartData.length === 0) return <div className="text-xs text-ink/40 text-center py-4">No data</div>;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d6b4f" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#3d6b4f" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e2db" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9c9686' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 8, fill: '#b5ae9e' }} axisLine={false} tickLine={false} tickFormatter={fmtYAxis} width={32} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e2db', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '6px 10px' }}
          formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']}
          labelFormatter={(_, p) => p?.[0]?.payload?.key || ''}
        />
        <Area type="monotone" dataKey="value" stroke="#3d6b4f" strokeWidth={2} fill="url(#aGrad)" dot={{ r: 2.5, fill: '#3d6b4f', stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 4, fill: '#3d6b4f', stroke: '#fff', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Period filter ── */
function PeriodFilter({ active, onChange }: { active: Period; onChange: (p: Period) => void }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-cream-dark/50 bg-white p-0.5">
      {PERIODS.map((p) => (
        <button key={p.key} type="button" onClick={() => onChange(p.key)}
          className={cx('rounded-md px-3 py-1 text-[11px] font-medium transition-all',
            active === p.key ? 'bg-brand text-white shadow-sm' : 'text-ink/45 hover:text-ink/70 hover:bg-cream-dark/30')}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

const PinIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0 text-ink/40">
    <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 7a2 2 0 110-4 2 2 0 010 4z" fill="currentColor" />
  </svg>
);

/* ── Shop card ── */
function ShopCard({ shop, trend, periodKey, onClick }: {
  shop: ShopSummary; trend?: Record<string, number>; periodKey: Period; onClick: () => void;
}) {
  return (
    <Card className="p-0 overflow-hidden cursor-pointer transition-all hover:shadow-elevated hover:-translate-y-0.5 group" onClick={onClick}>
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-brand/10 flex items-center justify-center text-brand font-bold text-[10px]">
            {shop.shopName.replace('Shop ', '#')}
          </div>
          <div>
            <div className="text-sm font-semibold text-ink leading-tight">{shop.shopName}</div>
            {shop.location && <div className="flex items-center gap-0.5 text-[10px] text-ink/45"><PinIcon /> {shop.location}</div>}
          </div>
        </div>
        <DeltaBadge delta={shop.delta} label={prevPeriodLabel(periodKey)} />
      </div>
      <div className="px-4 flex items-baseline gap-5 text-ink">
        <div><span className="text-lg font-bold">{fmtCurrency(shop.revenue)}</span><span className="text-[10px] text-ink/40 ml-1">{shop.invoices} inv</span></div>
        <div><span className="text-sm font-semibold text-ink/70">{shop.totalStock}</span><span className="text-[10px] text-ink/40 ml-1">stock</span></div>
      </div>
      <div className="px-1 pt-1 pb-1">
        {trend ? <TrendChart data={trend} period={periodKey} height={130} /> : <div className="text-xs text-ink/30 py-4 text-center">No data</div>}
      </div>
      <div className="h-0.5 bg-brand/10 group-hover:bg-brand/40 transition-colors" />
    </Card>
  );
}

/* ── Shop detail with inventory intelligence ── */

function ShopDetail({ shopId }: { shopId: string }) {
  const { hasRole } = useAuth();
  const [intel, setIntel] = useState<IntelligenceData | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sales, setSales] = useState<{ totalRevenue: number; totalInvoices: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const canSales = hasRole('ACCOUNTS', 'ADMIN');
  const isAdmin = hasRole('ADMIN');

  const loadReports = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const q = params.toString() ? `?${params}` : '';
    Promise.all([
      canSales ? apiGet<{ totalRevenue: number; totalInvoices: number }>(`/reports/${shopId}/sales${q}`).then(setSales).catch(() => setSales(null)) : Promise.resolve(),
      isAdmin ? apiGet<IntelligenceData>(`/reports/admin/${shopId}/inventory-intelligence`).then(setIntel).catch(() => setIntel(null)) : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [shopId, startDate, endDate, canSales, isAdmin]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const s = intel?.summary;

  return (
    <div className="space-y-3">
      {/* Row 1: Sales + Summary cards */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Sales */}
        {canSales && (
          <Card className="p-4 space-y-3">
            <div className="flex items-end justify-between gap-2 flex-wrap">
              <div className="text-sm font-semibold text-ink">Sales</div>
              <div className="flex items-end gap-2">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={cx(inputClass, 'text-xs py-1 px-2')} />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={cx(inputClass, 'text-xs py-1 px-2')} />
                <Button variant="secondary" onClick={loadReports} disabled={loading} className="text-xs py-1">Go</Button>
              </div>
            </div>
            {sales && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-cream-light border border-cream-dark/40 p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-ink/40">Revenue</div>
                  <div className="text-lg font-bold text-ink">₹{Number(sales.totalRevenue).toFixed(0)}</div>
                </div>
                <div className="rounded-lg bg-cream-light border border-cream-dark/40 p-2.5">
                  <div className="text-[9px] uppercase tracking-widest text-ink/40">Invoices</div>
                  <div className="text-lg font-bold text-ink">{sales.totalInvoices}</div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Inventory summary */}
        {isAdmin && intel && (
          <Card className="p-4">
            <div className="text-sm font-semibold text-ink mb-3">Inventory health</div>
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-cream-light border border-cream-dark/40 p-2.5 text-center">
                <div className="text-[9px] uppercase tracking-widest text-ink/40">Items</div>
                <div className="text-lg font-bold text-ink">{s?.totalItems}</div>
              </div>
              <div className="rounded-lg bg-cream-light border border-cream-dark/40 p-2.5 text-center">
                <div className="text-[9px] uppercase tracking-widest text-ink/40">Stock</div>
                <div className="text-lg font-bold text-ink">{s?.totalStock}</div>
              </div>
              <div className={cx('rounded-lg border p-2.5 text-center',
                (s?.flaggedItems ?? 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-cream-light border-cream-dark/40')}>
                <div className="text-[9px] uppercase tracking-widest text-ink/40">Flagged</div>
                <div className={cx('text-lg font-bold', (s?.flaggedItems ?? 0) > 0 ? 'text-red-600' : 'text-ink')}>{s?.flaggedItems}</div>
              </div>
              <div className={cx('rounded-lg border p-2.5 text-center',
                (s?.totalVarianceValue ?? 0) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-cream-light border-cream-dark/40')}>
                <div className="text-[9px] uppercase tracking-widest text-ink/40">Variance</div>
                <div className={cx('text-lg font-bold', (s?.totalVarianceValue ?? 0) > 0 ? 'text-amber-600' : 'text-ink')}>₹{s?.totalVarianceValue?.toLocaleString()}</div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Row 2: Stock reconciliation */}
      {isAdmin && intel && intel.reconciliation.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-cream-dark/40 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ink">Stock reconciliation</div>
              <div className="text-[11px] text-ink/50">Compares stock records vs invoiced sales to flag unaccounted losses.</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-cream-dark/30">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-ink/60">Item</th>
                  <th className="text-right px-2 py-2 font-medium text-ink/60">Stock In</th>
                  <th className="text-right px-2 py-2 font-medium text-ink/60">Sold</th>
                  <th className="text-right px-2 py-2 font-medium text-ink/60">Transferred</th>
                  <th className="text-right px-2 py-2 font-medium text-ink/60">Other Loss</th>
                  <th className="text-right px-2 py-2 font-medium text-ink/60">Current</th>
                  <th className="text-right px-2 py-2 font-medium text-ink/60">Unaccounted</th>
                  <th className="text-center px-2 py-2 font-medium text-ink/60">Status</th>
                </tr>
              </thead>
              <tbody>
                {intel.reconciliation.map((r) => (
                  <tr key={r.itemId} className={cx('border-t border-cream-dark/30',
                    r.flag === 'critical' && 'bg-red-50/60', r.flag === 'warning' && 'bg-amber-50/40')}>
                    <td className="px-3 py-1.5 font-medium text-ink">{r.itemName}</td>
                    <td className="px-2 py-1.5 text-right text-ink/60">{r.stockIn}</td>
                    <td className="px-2 py-1.5 text-right text-ink/60">{r.invoicedSold}</td>
                    <td className="px-2 py-1.5 text-right text-ink/60">{r.transferOut}</td>
                    <td className="px-2 py-1.5 text-right text-ink/60">{r.otherLoss}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-ink">{r.currentStock}</td>
                    <td className={cx('px-2 py-1.5 text-right font-bold',
                      r.unaccounted === 0 ? 'text-ink/30' : r.unaccounted > 0 ? 'text-amber-600' : 'text-red-600')}>
                      {r.unaccounted > 0 ? `+${r.unaccounted}` : r.unaccounted}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={cx('rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
                        r.flag === 'ok' && 'bg-emerald-50 text-emerald-700',
                        r.flag === 'warning' && 'bg-amber-50 text-amber-700',
                        r.flag === 'critical' && 'bg-red-100 text-red-700')}>
                        {r.flag === 'ok' ? 'OK' : r.flag === 'warning' ? 'Check' : 'Alert'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Row 3: Top sellers + Peak insights + Dispatches */}
      {isAdmin && intel && (
        <div className="grid gap-3 lg:grid-cols-3">
          {/* Top sellers */}
          <Card className="overflow-hidden">
            <div className="px-4 py-2.5 border-b border-cream-dark/40">
              <div className="text-sm font-semibold text-ink">Top sellers</div>
            </div>
            {intel.topSellers.length > 0 ? (
              <div className="divide-y divide-cream-dark/30">
                {intel.topSellers.slice(0, 5).map((r, i) => (
                  <div key={r.itemId} className="px-4 py-2 flex items-center gap-2">
                    <span className="text-[10px] text-ink/30 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-ink truncate">{r.itemName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="h-1 rounded-full bg-brand/15 w-16 overflow-hidden">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${r.pctOfTotal}%` }} />
                        </div>
                        <span className="text-[9px] text-ink/40">{r.pctOfTotal}%</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-ink">{r.totalSold}</span>
                  </div>
                ))}
              </div>
            ) : <div className="p-4 text-xs text-ink/40">No sales data.</div>}
          </Card>

          {/* Peak hours & days */}
          <Card className="overflow-hidden">
            <div className="px-4 py-2.5 border-b border-cream-dark/40">
              <div className="text-sm font-semibold text-ink">Peak hours & days</div>
            </div>
            <div className="p-3">
              {intel.peakHours.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] uppercase tracking-widest text-ink/40 mb-1.5">Busiest hours</div>
                  <ResponsiveContainer width="100%" height={70}>
                    <BarChart data={intel.peakHours} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#9c9686' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6, padding: '4px 8px' }}
                        formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#3d6b4f" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {intel.peakDays.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-ink/40 mb-1.5">Busiest days</div>
                  <ResponsiveContainer width="100%" height={70}>
                    <BarChart data={intel.peakDays} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="day" tick={{ fontSize: 8, fill: '#9c9686' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6, padding: '4px 8px' }}
                        formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#6b8f7b" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </Card>

          {/* Dispatches */}
          <Card className="overflow-hidden">
            <div className="px-4 py-2.5 border-b border-cream-dark/40">
              <div className="text-sm font-semibold text-ink">Dispatch history</div>
            </div>
            {intel.frequentDispatches.length > 0 ? (
              <div className="divide-y divide-cream-dark/30">
                {intel.frequentDispatches.map((r) => (
                  <div key={r.itemId} className="px-4 py-2 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-ink">{r.itemName}</div>
                      <div className="text-[10px] text-ink/40">{r.dispatchCount} dispatches</div>
                    </div>
                    <span className="text-xs font-semibold text-ink">{r.totalQty} units</span>
                  </div>
                ))}
              </div>
            ) : <div className="p-4 text-xs text-ink/40">No dispatches.</div>}
          </Card>
        </div>
      )}
    </div>
  );
}

/* ── Main Reports ── */

export function Reports() {
  const { hasRole } = useAuth();
  const { shopId, shops, setShopId, isAdmin } = useShop();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [period, setPeriod] = useState<Period>('weekly');
  const [dashboardSummary, setDashboardSummary] = useState<ShopSummary[]>([]);
  const [trendByShop, setTrendByShop] = useState<TrendByShop>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([
      apiGet<ShopSummary[]>(`/reports/admin/dashboard-summary?period=${period}`).then(setDashboardSummary).catch(() => setDashboardSummary([])),
      apiGet<TrendByShop>(`/reports/admin/sales-trend-by-shop?period=${period}`).then(setTrendByShop).catch(() => setTrendByShop({})),
    ]).finally(() => setLoading(false));
  }, [isAdmin, period]);

  useEffect(() => {
    if (activeTab !== 'all' && isAdmin) setShopId(activeTab);
  }, [activeTab, isAdmin, setShopId]);

  if (!isAdmin) {
    return (
      <Page className="space-y-4">
        <div className="text-lg font-semibold text-ink">Dashboard</div>
        {!shopId ? <Callout tone="danger">No shop assigned.</Callout> : <ShopDetail shopId={shopId} />}
      </Page>
    );
  }

  const totalRevenue = dashboardSummary.reduce((s, sh) => s + Number(sh.revenue), 0);
  const totalInvoices = dashboardSummary.reduce((s, sh) => s + sh.invoices, 0);
  const totalStock = dashboardSummary.reduce((s, sh) => s + sh.totalStock, 0);
  const totalPrevRev = dashboardSummary.reduce((s, sh) => s + Number(sh.prevRevenue), 0);
  const totalDelta = totalPrevRev > 0 ? Math.round(((totalRevenue - totalPrevRev) / totalPrevRev) * 1000) / 10 : totalRevenue > 0 ? 100 : 0;

  return (
    <Page className="space-y-4">
      {error && <Callout tone="danger">{error}</Callout>}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink">Dashboard</h1>
          <p className="text-xs text-ink/50">Overview across all shops.</p>
        </div>
        <PeriodFilter active={period} onChange={setPeriod} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto rounded-lg border border-cream-dark/50 bg-white p-0.5">
        <button type="button" onClick={() => setActiveTab('all')}
          className={cx('rounded-md px-4 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
            activeTab === 'all' ? 'bg-brand text-white shadow-sm' : 'text-ink/50 hover:bg-cream-dark/50 hover:text-ink')}>
          All Shops
        </button>
        {shops.map((s) => (
          <button key={s.id} type="button" onClick={() => setActiveTab(s.id)}
            className={cx('rounded-md px-4 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
              activeTab === s.id ? 'bg-brand text-white shadow-sm' : 'text-ink/50 hover:bg-cream-dark/50 hover:text-ink')}>
            {s.name}
          </button>
        ))}
      </div>

      {/* All shops */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3">
              <div className="text-[9px] uppercase tracking-widest text-ink/40 font-medium">Revenue</div>
              <div className="mt-1 text-xl font-bold text-ink">{fmtCurrency(totalRevenue)}</div>
              <DeltaBadge delta={totalDelta} label={prevPeriodLabel(period)} />
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase tracking-widest text-ink/40 font-medium">Invoices</div>
              <div className="mt-1 text-xl font-bold text-ink">{totalInvoices}</div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase tracking-widest text-ink/40 font-medium">Total stock</div>
              <div className="mt-1 text-xl font-bold text-ink">{totalStock.toLocaleString()}</div>
            </Card>
            <Card className="p-3">
              <div className="text-[9px] uppercase tracking-widest text-ink/40 font-medium">Shops</div>
              <div className="mt-1 text-xl font-bold text-ink">{dashboardSummary.length}</div>
            </Card>
          </div>
          {loading ? <div className="text-sm text-ink/50 py-8 text-center">Loading...</div> : (
            <div className="grid gap-4 sm:grid-cols-2">
              {dashboardSummary.map((shop) => (
                <ShopCard key={shop.shopId} shop={shop} trend={trendByShop[shop.shopId]} periodKey={period} onClick={() => setActiveTab(shop.shopId)} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab !== 'all' && shopId && <ShopDetail shopId={shopId} />}
    </Page>
  );
}
