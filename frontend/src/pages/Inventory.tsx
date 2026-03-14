import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '../api/client';
import { useShop } from '../contexts/useShop';
import type { Item } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { Callout, Page, PageHeader } from '../components/ui/Page';
import { Table, TableWrap, Td, Th } from '../components/ui/Table';
import { cx } from '../lib/cx';

interface ItemWithStock extends Item {
  currentStock: number;
}

export function Inventory() {
  const { shopId, shops, setShopId, isAdmin } = useShop();
  const [items, setItems] = useState<ItemWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showItemForm, setShowItemForm] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemWithStock | null>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [adjustChange, setAdjustChange] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    if (!shopId) return;
    setLoading(true);
    setError('');
    apiGet<ItemWithStock[]>(`/inventory/${shopId}/stock`)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [shopId]);

  useEffect(() => {
    if (shopId) load();
    else setItems([]);
  }, [load, shopId]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    setSubmitting(true);
    setError('');
    try {
      await apiPost('/inventory/item', { name, sku, price: Number(price), shopId });
      setName('');
      setSku('');
      setPrice('');
      setShowItemForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  };

  const openAdjust = (item: ItemWithStock) => {
    setSelectedItem(item);
    setAdjustChange(0);
    setAdjustReason('');
    setShowAdjustForm(true);
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !selectedItem) return;
    setSubmitting(true);
    setError('');
    try {
      await apiPost('/inventory/adjust', {
        itemId: selectedItem.id,
        change: adjustChange,
        reason: adjustReason,
        shopId,
      });
      setShowAdjustForm(false);
      setSelectedItem(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Items and stock levels for the selected shop."
        right={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {isAdmin && shops.length > 0 ? (
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
            ) : null}
            {shopId ? (
              <Button variant="primary" onClick={() => setShowItemForm(true)}>
                Add item
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? <Callout tone="danger">{error}</Callout> : null}
      {!shopId && !isAdmin ? <Callout tone="danger">No shop assigned.</Callout> : null}

      {showItemForm && shopId ? (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">New item</div>
              <div className="mt-1 text-xs text-ink/60">Add a new item to this shop.</div>
            </div>
            <Button variant="ghost" onClick={() => setShowItemForm(false)}>
              Close
            </Button>
          </div>

          <form onSubmit={handleCreateItem} className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Item name" className={inputClass} />
            </Field>
            <Field label="SKU">
              <input value={sku} onChange={(e) => setSku(e.target.value)} required placeholder="SKU" className={inputClass} />
            </Field>
            <Field label="Price">
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                placeholder="0.00"
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-3 flex flex-wrap items-center justify-end gap-2 pt-1">
              <Button variant="secondary" type="button" onClick={() => setShowItemForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {showAdjustForm && selectedItem ? (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">Adjust stock</div>
              <div className="mt-1 text-xs text-ink/60">
                {selectedItem.name} • Current stock:{' '}
                <span className="font-semibold text-ink">{selectedItem.currentStock}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAdjustForm(false);
                setSelectedItem(null);
              }}
            >
              Close
            </Button>
          </div>

          <form onSubmit={handleAdjust} className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Field label="Change" hint="Positive add, negative remove">
                <input
                  type="number"
                  value={adjustChange || ''}
                  onChange={(e) => setAdjustChange(Number(e.target.value))}
                  required
                  placeholder="e.g. 10 or -5"
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Reason">
                <input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  required
                  placeholder="e.g. Restock, Damage"
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="sm:col-span-3 flex flex-wrap items-center justify-end gap-2 pt-1">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setShowAdjustForm(false);
                  setSelectedItem(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Apply'}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {shopId ? (
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-ink/60">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-ink/60">No items found.</div>
          ) : (
            <TableWrap>
              <Table>
                <thead className="bg-cream-dark/50">
                  <tr>
                    <Th>Name</Th>
                    <Th>SKU</Th>
                    <Th>Price</Th>
                    <Th>Stock</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-cream-dark/60 hover:bg-cream-dark/40">
                      <Td className="font-medium">{item.name}</Td>
                      <Td className="text-ink/60">{item.sku}</Td>
                      <Td className="text-ink/60">₹{Number(item.price).toFixed(2)}</Td>
                      <Td className={cx(item.currentStock <= 0 ? 'text-red-600' : 'text-ink/70')}>
                        {item.currentStock}
                      </Td>
                      <Td className="text-right">
                        <Button variant="secondary" size="sm" type="button" onClick={() => openAdjust(item)}>
                          Adjust
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      ) : null}
    </Page>
  );
}
