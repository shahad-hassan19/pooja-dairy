import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../api/client';
import { useShop } from '../contexts/useShop';
import type { Item } from '../types';
import type { InvoiceItemInput } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { Callout, Page, PageHeader } from '../components/ui/Page';
import { Table, TableWrap, Td, Th } from '../components/ui/Table';
import { cx } from '../lib/cx';

export function Billing() {
  const { shopId, shops, setShopId, isAdmin } = useShop();
  const [items, setItems] = useState<Item[]>([]);
  const [lines, setLines] = useState<InvoiceItemInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!shopId) {
      setItems([]);
      return;
    }
    setLoading(true);
    apiGet<Item[]>(`/inventory/${shopId}/items`)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [shopId]);

  const addLine = () => {
    const first = items[0];
    setLines((prev) => [
      ...prev,
      { itemId: first?.id ?? '', quantity: 1, price: first ? Number(first.price) : 0 },
    ]);
  };

  const updateLine = (index: number, field: keyof InvoiceItemInput, value: number | string) => {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[index] };
      if (field === 'itemId') {
        line.itemId = value as string;
        const item = items.find((i) => i.id === value);
        if (item) line.price = Number(item.price);
      } else if (field === 'quantity') {
        line.quantity = Number(value);
      } else {
        line.price = Number(value);
      }
      next[index] = line;
      return next;
    });
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const total = lines.reduce((sum, l) => sum + l.quantity * l.price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || lines.length === 0) return;
    setSubmitting(true);
    setError('');
    setSuccess(false);
    try {
      await apiPost('/billing', { shopId, items: lines });
      setLines([]);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page className="space-y-6">
      <PageHeader
        title="Billing"
        description="Create a new invoice for the selected shop."
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
      {success ? <Callout tone="success">Invoice created successfully.</Callout> : null}
      {!shopId && !isAdmin ? <Callout tone="danger">No shop assigned.</Callout> : null}

      {shopId ? (
        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-ink">Invoice lines</div>
              <div className="mt-1 text-xs text-ink/60">
                Add items, adjust quantity/price, then create the invoice.
              </div>
            </div>
            <Button variant="secondary" type="button" onClick={addLine} disabled={loading || items.length === 0}>
              Add line
            </Button>
          </div>

          {lines.length === 0 ? (
            <div className="mt-5 rounded-xl bg-cream-dark/50 px-4 py-3 text-sm text-ink/60 ring-1 ring-cream-dark/60">
              No lines yet. Click “Add line” to start.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <Card className="overflow-hidden">
                <TableWrap>
                  <Table>
                    <thead className="bg-cream-dark/50">
                      <tr>
                        <Th>Item</Th>
                        <Th>Qty</Th>
                        <Th>Price</Th>
                        <Th>Subtotal</Th>
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
                              {items.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.name} (₹{Number(it.price).toFixed(2)})
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
                              className={cx(inputClass, 'h-9 w-24')}
                            />
                          </Td>
                          <Td>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={line.price}
                              onChange={(e) => updateLine(i, 'price', e.target.value)}
                              className={cx(inputClass, 'h-9 w-32')}
                            />
                          </Td>
                          <Td className="text-ink/70">₹{(line.quantity * line.price).toFixed(2)}</Td>
                          <Td className="text-right">
                            <Button variant="ghost" size="sm" type="button" onClick={() => removeLine(i)}>
                              Remove
                            </Button>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              </Card>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-ink/60">
                  Total:{' '}
                  <span className="font-semibold text-ink">₹{total.toFixed(2)}</span>
                </div>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create invoice'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      ) : null}
    </Page>
  );
}
