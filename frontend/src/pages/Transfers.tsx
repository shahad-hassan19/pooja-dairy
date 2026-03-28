import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { useShop } from '../contexts/useShop';
import type { Item, Shop, Transfer } from '../types';
import type { TransferItemInput, TransferStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { Callout, Page, PageHeader } from '../components/ui/Page';
import { Table, TableWrap, Td, Th } from '../components/ui/Table';
import { Skeleton } from '../components/ui/Skeleton';
import { cx } from '../lib/cx';

export function Transfers() {
  const { shops, isAdmin } = useShop();
  const { user, hasRole } = useAuth();
  const [fromShopId, setFromShopId] = useState('');
  const [toShopId, setToShopId] = useState('');
  const [distributorItems, setDistributorItems] = useState<Item[]>([]);
  const [lines, setLines] = useState<TransferItemInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [incoming, setIncoming] = useState<Transfer[]>([]);
  const [outgoing, setOutgoing] = useState<Transfer[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [retailList, setRetailList] = useState<Shop[]>([]);
  const [shopNameById, setShopNameById] = useState<Record<string, string>>({});
  const [itemNameById, setItemNameById] = useState<Record<string, string>>({});
  const [outgoingStatusFilter, setOutgoingStatusFilter] = useState<'ALL' | TransferStatus>('ALL');

  const distributors = shops.filter((s) => s.type === 'DISTRIBUTOR');
  const retailers = isAdmin ? shops.filter((s) => s.type === 'RETAIL') : retailList;
  const canConfirm = hasRole('SALES');
  const canCreate = isAdmin || hasRole('STOCK_MANAGER');

  const filteredOutgoing =
    outgoingStatusFilter === 'ALL'
      ? outgoing
      : outgoing.filter((t) => t.status === outgoingStatusFilter);

  const statusCounts = useMemo(() => {
    const pending = outgoing.filter((t) => t.status === 'PENDING').length;
    const confirmed = outgoing.filter((t) => t.status === 'CONFIRMED').length;
    const rejected = outgoing.filter((t) => t.status === 'REJECTED').length;
    return { pending, confirmed, rejected };
  }, [outgoing]);

  // For non-admins, lock "from" to user's own shopId and load retailers list
  useEffect(() => {
    if (!isAdmin && user?.shopId) {
      setFromShopId(user.shopId);
      apiGet<Shop[]>('/shops/retail').then(setRetailList).catch(() => setRetailList([]));
    }
  }, [isAdmin, user?.shopId]);

  useEffect(() => {
    if (!fromShopId) {
      setDistributorItems([]);
      return;
    }
    setLoading(true);
    apiGet<Item[]>(`/inventory/${fromShopId}/items`)
      .then(setDistributorItems)
      .catch(() => setDistributorItems([]))
      .finally(() => setLoading(false));
  }, [fromShopId]);

  useEffect(() => {
    if (canConfirm) {
      apiGet<Transfer[]>('/transfers/pending')
        .then(setIncoming)
        .catch(() => setIncoming([]));
    } else {
      setIncoming([]);
    }
  }, [canConfirm]);

  useEffect(() => {
    if (canCreate) {
      apiGet<Transfer[]>('/transfers/outgoing')
        .then(setOutgoing)
        .catch(() => setOutgoing([]));
    } else {
      setOutgoing([]);
    }
  }, [canCreate]);

  // Resolve shop names and item names for incoming transfers
  useEffect(() => {
    let cancelled = false;
    const ids = Array.from(
      new Set(
        [...incoming, ...outgoing]
          .flatMap((t) => [t.fromShopId, t.toShopId])
          .filter(Boolean),
      ),
    );
    if (ids.length === 0) return;
    (async () => {
      try {
        const shopsResp = await apiGet<Shop[]>(`/shops/by-ids?ids=${ids.join(',')}`);
        if (cancelled) return;
        const names: Record<string, string> = {};
        for (const s of shopsResp) names[s.id] = s.name;
        setShopNameById((prev) => ({ ...prev, ...names }));
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [incoming, outgoing]);

  useEffect(() => {
    let cancelled = false;
    const itemIds = Array.from(
      new Set([...incoming, ...outgoing].flatMap((t) => t.items.map((it) => it.itemId))),
    );
    if (itemIds.length === 0) return;
    (async () => {
      try {
        const items = await apiGet<{ id: string; name: string }[]>(
          `/inventory/items/by-ids?ids=${itemIds.join(',')}`,
        );
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const it of items) map[it.id] = it.name;
        setItemNameById((prev) => ({ ...prev, ...map }));
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [incoming, outgoing]);

  const confirmIncoming = async (id: string) => {
    setConfirmingId(id);
    try {
      await apiPost(`/transfers/${id}/confirm`, {});
      setIncoming((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // ignore for now; could add toast
    } finally {
      setConfirmingId(null);
    }
  };

  const addLine = () => {
    const first = distributorItems[0];
    setLines((prev) => [...prev, { itemId: first?.id ?? '', quantity: 1 }]);
  };

  const updateLine = (index: number, field: keyof TransferItemInput, value: string | number) => {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[index] };
      if (field === 'itemId') line.itemId = value as string;
      else line.quantity = Number(value);
      next[index] = line;
      return next;
    });
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromShopId || !toShopId || lines.length === 0) return;
    setSubmitting(true);
    setError('');
    setSuccess(false);
    try {
      await apiPost('/transfers', { fromShopId, toShopId, items: lines });
      setLines([]);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create transfer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page className="space-y-6">
      <PageHeader title="Transfers" description="Transfer stock from distributor to retail shop." />

      {error ? <Callout tone="danger">{error}</Callout> : null}
      {success ? <Callout tone="success">Transfer created successfully.</Callout> : null}

      {canConfirm && incoming.length > 0 && (
        <Card className="p-4 space-y-2">
          <div className="text-sm font-semibold text-ink">Incoming transfers</div>
          <div className="text-xs text-ink/60">Confirm receipt to update retail stock.</div>
          <div className="space-y-3">
            {incoming.map((t) => (
              <Card key={t.id} className="p-3 border border-cream-dark/60">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-xs text-ink/80">
                    <span className="font-medium">{shopNameById[t.fromShopId] ?? t.fromShopId}</span>
                    <span className="text-ink/50"> • {new Date(t.createdAt).toLocaleString()}</span>
                  </div>
                  {canConfirm && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => confirmIncoming(t.id)}
                      disabled={confirmingId === t.id}
                    >
                      {confirmingId === t.id ? 'Confirming…' : 'Confirm received'}
                    </Button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-cream-dark/40">
                      <tr>
                        <th className="text-left px-2 py-1 font-medium text-ink/70">Item</th>
                        <th className="text-right px-2 py-1 font-medium text-ink/70">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.items.map((it) => (
                        <tr key={it.id} className="border-t border-cream-dark/50">
                          <td className="px-2 py-1 text-ink">{itemNameById[it.itemId] ?? it.itemId}</td>
                          <td className="px-2 py-1 text-right text-ink">{it.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {!canCreate ? (
        <Callout tone="danger">Only Admin or Manager can create transfers.</Callout>
      ) : (
        <Card className="p-5 space-y-4">
          <div>
            <div className="text-sm font-semibold text-ink">Create transfer</div>
            <div className="mt-1 text-xs text-ink/60">Pick source + destination, then add items.</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="From (Distributor)">
                <select
                  value={fromShopId}
                  onChange={(e) => {
                    setFromShopId(e.target.value);
                    setLines([]);
                  }}
                  required
                  className={inputClass}
                  disabled={!isAdmin}
                >
                  <option value="">{isAdmin ? 'Select distributor' : 'Your shop'}</option>
                  {(isAdmin ? distributors : distributors.filter((d) => d.id === user?.shopId)).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="To (Retail)">
                <select value={toShopId} onChange={(e) => setToShopId(e.target.value)} required className={inputClass}>
                  <option value="">Select retail shop</option>
                  {retailers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={addLine}
                disabled={loading || distributorItems.length === 0}
              >
                Add item
              </Button>
              {loading && (
                <Skeleton className="h-3 w-24 rounded-full" />
              )}
            </div>

            {lines.length === 0 ? (
              <div className="rounded-xl bg-cream-dark/50 px-4 py-3 text-sm text-ink/60 ring-1 ring-cream-dark/60">
                Add at least one item to create a transfer.
              </div>
            ) : (
              <Card className="overflow-hidden">
                <TableWrap>
                  <Table>
                    <thead className="bg-cream-dark/50">
                      <tr>
                        <Th>Item</Th>
                        <Th>Quantity</Th>
                        <Th className="text-right">Actions</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, i) => (
                        <tr key={i} className="border-t border-cream-dark/60">
                          <Td>
                            <select
                              value={line.itemId}
                              onChange={(e) => updateLine(i, 'itemId', e.target.value)}
                              required
                              className={cx(inputClass, 'h-9')}
                            >
                              <option value="">Select item</option>
                              {distributorItems.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.name}
                                </option>
                              ))}
                            </select>
                          </Td>
                          <Td>
                            <input
                              type="number"
                              min={1}
                              value={line.quantity}
                              onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                              className={cx(inputClass, 'h-9 w-28')}
                            />
                          </Td>
                          <Td className="text-right">
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)}>
                              Remove
                            </Button>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              </Card>
            )}

            {lines.length > 0 ? (
              <div className="flex items-center justify-end">
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create transfer'}
                </Button>
              </div>
            ) : null}
          </form>
        </Card>
      )}

      {canCreate && outgoing.length > 0 && (
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-ink">Outgoing transfers</div>
            <select
              value={outgoingStatusFilter}
              onChange={(e) =>
                setOutgoingStatusFilter(e.target.value as 'ALL' | TransferStatus)
              }
              className="text-xs rounded-md border border-cream-dark/60 bg-cream-dark/20 px-2 py-1 text-ink/80"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink/60">
            <span>
              Transfers created from the distributor to retail shops, grouped by status.
            </span>
            <span className="font-medium text-ink/70">
              Pending: {statusCounts.pending} • Confirmed: {statusCounts.confirmed} •
              Rejected: {statusCounts.rejected}
            </span>
          </div>
          <div className="space-y-3">
            {filteredOutgoing.length === 0 ? (
              <div className="text-xs text-ink/50">
                No outgoing transfers for this status.
              </div>
            ) : (
              filteredOutgoing.map((t) => (
                <Card key={t.id} className="p-3 border border-cream-dark/60">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-xs text-ink/80">
                      <span className="font-medium">
                        To: {shopNameById[t.toShopId] ?? t.toShopId}
                      </span>
                      <span className="text-ink/50">
                        {' '}
                        • {new Date(t.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div
                      className={cx(
                        'text-[10px] px-2 py-0.5 rounded-full border',
                        t.status === 'PENDING' &&
                          'border-amber-500 bg-amber-50 text-amber-700',
                        t.status === 'CONFIRMED' &&
                          'border-emerald-500 bg-emerald-50 text-emerald-700',
                        t.status === 'REJECTED' &&
                          'border-red-500 bg-red-50 text-red-700',
                      )}
                    >
                      {t.status}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-cream-dark/40">
                        <tr>
                          <th className="text-left px-2 py-1 font-medium text-ink/70">Item</th>
                          <th className="text-right px-2 py-1 font-medium text-ink/70">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.items.map((it) => (
                          <tr key={it.id} className="border-t border-cream-dark/50">
                            <td className="px-2 py-1 text-ink">
                              {itemNameById[it.itemId] ?? it.itemId}
                            </td>
                            <td className="px-2 py-1 text-right text-ink">{it.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>
      )}
    </Page>
  );
}
