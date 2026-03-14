import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../api/client';
import { useShop } from '../contexts/useShop';
import type { Item } from '../types';
import type { TransferItemInput } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { Callout, Page, PageHeader } from '../components/ui/Page';
import { Table, TableWrap, Td, Th } from '../components/ui/Table';
import { cx } from '../lib/cx';

export function Transfers() {
  const { shops, isAdmin } = useShop();
  const [fromShopId, setFromShopId] = useState('');
  const [toShopId, setToShopId] = useState('');
  const [distributorItems, setDistributorItems] = useState<Item[]>([]);
  const [lines, setLines] = useState<TransferItemInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const distributors = shops.filter((s) => s.type === 'DISTRIBUTOR');
  const retailers = shops.filter((s) => s.type === 'RETAIL');

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

      {!isAdmin || shops.length === 0 ? (
        <Callout tone="danger">
          {!isAdmin ? 'Only admins can create transfers across shops.' : 'No shops available.'}
        </Callout>
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
                >
                  <option value="">Select distributor</option>
                  {distributors.map((s) => (
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
    </Page>
  );
}
