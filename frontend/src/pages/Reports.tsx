import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { useShop } from '../contexts/useShop';
import type { Item } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { Callout, Page, PageHeader } from '../components/ui/Page';
import { Table, TableWrap, Td, Th } from '../components/ui/Table';

function shortId(id: string) {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function Reports() {
  const { hasRole } = useAuth();
  const { shopId, shops, setShopId, isAdmin } = useShop();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sales, setSales] = useState<{ totalRevenue: number; totalInvoices: number } | null>(null);
  const [stockSummary, setStockSummary] = useState<{ itemId: string; currentStock: number }[] | null>(null);
  const [transferSummary, setTransferSummary] = useState<{ transfersSent: number; transfersReceived: number } | null>(null);
  const [globalRevenue, setGlobalRevenue] = useState<{ totalRevenue: number; totalInvoices: number } | null>(null);
  const [revenueByShop, setRevenueByShop] = useState<{ shopId: string; revenue: number }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [itemNameById, setItemNameById] = useState<Record<string, string>>({});

  const canSales = hasRole('ACCOUNTS', 'ADMIN');
  const canStock = hasRole('STOCK_MANAGER', 'ADMIN');

  const loadShopReports = useCallback(() => {
    if (!shopId) return;
    setError('');
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString() ? `?${params}` : '';
    Promise.all([
      canSales ? apiGet<{ totalRevenue: number; totalInvoices: number }>(`/reports/${shopId}/sales${query}`).then(setSales).catch(() => setSales(null)) : Promise.resolve(),
      canStock ? apiGet<{ itemId: string; currentStock: number }[]>(`/reports/${shopId}/stock`).then(setStockSummary).catch(() => setStockSummary(null)) : Promise.resolve(),
      canStock ? apiGet<{ transfersSent: number; transfersReceived: number }>(`/reports/${shopId}/transfers`).then(setTransferSummary).catch(() => setTransferSummary(null)) : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [shopId, startDate, endDate, canSales, canStock]);

  useEffect(() => {
    queueMicrotask(() => {
      if (shopId) loadShopReports();
      else setSales(null);
    });
  }, [loadShopReports, shopId]);

  const loadAdminReports = useCallback(() => {
    if (!isAdmin) return;
    setError('');
    setLoading(true);
    Promise.all([
      apiGet<{ totalRevenue: number; totalInvoices: number }>('/reports/admin/global-revenue')
        .then(setGlobalRevenue)
        .catch(() => setGlobalRevenue(null)),
      apiGet<{ shopId: string; revenue: number }[]>('/reports/admin/revenue-by-shop')
        .then(setRevenueByShop)
        .catch(() => setRevenueByShop(null)),
    ]).finally(() => setLoading(false));
  }, [isAdmin]);

  useEffect(() => {
    queueMicrotask(() => {
      if (isAdmin) loadAdminReports();
      else {
        setGlobalRevenue(null);
        setRevenueByShop(null);
      }
    });
  }, [loadAdminReports, isAdmin]);

  useEffect(() => {
    let cancelled = false;
    if (!shopId) return () => {};
    if (!stockSummary || stockSummary.length === 0) return () => {};

    const missingIds = stockSummary.map((r) => r.itemId).filter((id) => !itemNameById[id]);
    if (missingIds.length === 0) return () => {};

    apiGet<Item[]>(`/inventory/${shopId}/items`)
      .then((items) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const it of items) next[it.id] = it.name;
        setItemNameById((prev) => ({ ...prev, ...next }));
      })
      .catch(() => {
        // Best-effort only; fall back to IDs.
      });

    return () => {
      cancelled = true;
    };
  }, [shopId, stockSummary, itemNameById]);

  return (
    <Page className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Sales, stock, and transfer summaries."
        right={
          isAdmin && shops.length > 0 ? (
            <div className="min-w-[240px]">
              <Field label="Shop">
                <select value={shopId || ''} onChange={(e) => setShopId(e.target.value)} className={inputClass}>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : null
        }
      />

      {error ? <Callout tone="danger">{error}</Callout> : null}
      {!shopId && !isAdmin ? <Callout tone="danger">No shop selected.</Callout> : null}

      {canSales && shopId ? (
        <Card className="p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-ink">Sales summary</div>
              <div className="mt-1 text-xs text-ink/60">Filter by date range.</div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-[180px]">
                <Field label="Start date">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
                </Field>
              </div>
              <div className="min-w-[180px]">
                <Field label="End date">
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
                </Field>
              </div>
              <Button variant="secondary" onClick={loadShopReports} disabled={loading}>
                Apply
              </Button>
            </div>
          </div>

          {sales !== null ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="p-4">
                <div className="text-xs uppercase tracking-wider text-ink/60">Total revenue</div>
                <div className="mt-2 text-2xl font-semibold text-ink">₹{Number(sales.totalRevenue).toFixed(2)}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs uppercase tracking-wider text-ink/60">Invoices</div>
                <div className="mt-2 text-2xl font-semibold text-ink">{sales.totalInvoices}</div>
              </Card>
            </div>
          ) : (
            <div className="text-sm text-ink/60">No data.</div>
          )}
        </Card>
      ) : null}

      {canStock && shopId ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="text-sm font-semibold text-ink">Transfer summary</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="text-xs uppercase tracking-wider text-ink/60">Sent</div>
                <div className="mt-2 text-2xl font-semibold text-ink">{transferSummary?.transfersSent ?? '—'}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs uppercase tracking-wider text-ink/60">Received</div>
                <div className="mt-2 text-2xl font-semibold text-ink">{transferSummary?.transfersReceived ?? '—'}</div>
              </Card>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5">
              <div className="text-sm font-semibold text-ink">Stock summary</div>
              <div className="mt-1 text-xs text-ink/60">Current stock by item ID.</div>
            </div>
            {stockSummary !== null && stockSummary.length > 0 ? (
              <TableWrap>
                <Table>
                  <thead className="bg-cream-dark/50">
                    <tr>
                      <Th>Item ID</Th>
                      <Th>Current stock</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockSummary.map((r) => (
                      <tr key={r.itemId} className="border-t border-cream-dark/60 hover:bg-cream-dark/40">
                        <Td className="font-medium" title={r.itemId}>
                          {itemNameById[r.itemId] ?? shortId(r.itemId)}
                        </Td>
                        <Td className="text-ink/60">{r.currentStock}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            ) : (
              <div className="px-5 pb-5 text-sm text-ink/60">
                {stockSummary === null ? 'No data.' : 'No stock data.'}
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {isAdmin ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="text-sm font-semibold text-ink">Admin — Global revenue</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="text-xs uppercase tracking-wider text-ink/60">Total revenue</div>
                <div className="mt-2 text-2xl font-semibold text-ink">
                  {globalRevenue ? `₹${Number(globalRevenue.totalRevenue).toFixed(2)}` : '—'}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-xs uppercase tracking-wider text-ink/60">Invoices</div>
                <div className="mt-2 text-2xl font-semibold text-ink">
                  {globalRevenue ? globalRevenue.totalInvoices : '—'}
                </div>
              </Card>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5">
              <div className="text-sm font-semibold text-ink">Revenue by shop</div>
              <div className="mt-1 text-xs text-ink/60">Top-level view for admins.</div>
            </div>
            {revenueByShop !== null && revenueByShop.length > 0 ? (
              <TableWrap>
                <Table>
                  <thead className="bg-cream-dark/50">
                    <tr>
                      <Th>Shop ID</Th>
                      <Th>Revenue</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueByShop.map((r) => (
                      <tr key={r.shopId} className="border-t border-cream-dark/60 hover:bg-cream-dark/40">
                        <Td className="font-medium" title={r.shopId}>
                          {shops.find((s) => s.id === r.shopId)?.name ?? shortId(r.shopId)}
                        </Td>
                        <Td className="text-ink/60">₹{Number(r.revenue).toFixed(2)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            ) : (
              <div className="px-5 pb-5 text-sm text-ink/60">No data.</div>
            )}
          </Card>
        </div>
      ) : null}
    </Page>
  );
}
