import { useEffect, useMemo, useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  type BillCounterState = { date: string; seq: number };
  const billCounterKey = useMemo(() => `pooja-billing:billCounter:${shopId ?? 'no-shop'}`, [shopId]);
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [billNo, setBillNo] = useState<number>(0);
  const [billDate, setBillDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [partyName, setPartyName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  type PaymentMethod = 'Cash' | 'Card' | 'UPI';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');

  const [entry, setEntry] = useState<{
    itemId: string;
    quantity: number;
    unit: string;
    rate: number;
    gstPercent: number;
  }>({ itemId: '', quantity: 1, unit: 'PCS', rate: 0, gstPercent: 0 });

  const [lines, setLines] = useState<
    Array<InvoiceItemInput & { unit?: string; gstPercent?: number; totalAmount?: number }>
  >([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const computeLineTotal = (quantity: number, rate: number, gstPercent: number) => {
    const base = Number(quantity || 0) * Number(rate || 0);
    const gst = base * (Number(gstPercent || 0) / 100);
    return base + gst;
  };

  const getAndSyncNextBillNo = () => {
    if (!shopId) return 0;
    const raw = localStorage.getItem(billCounterKey);
    let state: BillCounterState = { date: todayKey, seq: 0 };
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<BillCounterState>;
        if (typeof parsed.seq === 'number' && typeof parsed.date === 'string') {
          state = parsed.date === todayKey ? { date: parsed.date, seq: parsed.seq } : { date: todayKey, seq: 0 };
        }
      } catch {
        state = { date: todayKey, seq: 0 };
      }
    }
    localStorage.setItem(billCounterKey, JSON.stringify(state));
    return state.seq + 1;
  };

  const commitPrintedBillNo = (printedNo: number) => {
    if (!shopId) return;
    const state: BillCounterState = { date: todayKey, seq: printedNo };
    localStorage.setItem(billCounterKey, JSON.stringify(state));
  };

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

  useEffect(() => {
    if (!shopId) {
      setBillNo(0);
      return;
    }
    setBillNo(getAndSyncNextBillNo());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, billCounterKey]);

  useEffect(() => {
    if (!entry.itemId) return;
    const it = items.find((i) => i.id === entry.itemId);
    if (!it) return;
    setEntry((prev) => ({ ...prev, rate: Number(it.price) }));
  }, [entry.itemId, items]);

  const entryTotal = useMemo(() => {
    return computeLineTotal(entry.quantity, entry.rate, entry.gstPercent);
  }, [entry.gstPercent, entry.quantity, entry.rate]);

  const total = useMemo(() => {
    return lines.reduce((sum, l) => sum + (l.totalAmount ?? l.quantity * l.price), 0);
  }, [lines]);

  const addEntry = () => {
    if (!entry.itemId) return;
    if (!entry.quantity || entry.quantity <= 0) return;
    setLines((prev) => {
      const existingIndex = prev.findIndex((l) => l.itemId === entry.itemId);
      if (existingIndex === -1) {
        return [
          ...prev,
          {
            itemId: entry.itemId,
            quantity: Number(entry.quantity),
            price: Number(entry.rate),
            unit: entry.unit,
            gstPercent: Number(entry.gstPercent),
            totalAmount: entryTotal,
          },
        ];
      }
      const next = [...prev];
      const current = next[existingIndex];
      const nextQty = Number(current.quantity) + Number(entry.quantity);
      const rate = Number(entry.rate);
      const gstPercent = Number(entry.gstPercent);
      next[existingIndex] = {
        ...current,
        quantity: nextQty,
        price: rate,
        unit: entry.unit,
        gstPercent,
        totalAmount: computeLineTotal(nextQty, rate, gstPercent),
      };
      return next;
    });
    setSelectedIndex(null);
  };

  const deleteSelected = () => {
    setLines((prev) => {
      if (prev.length === 0) return prev;
      const idx = selectedIndex ?? prev.length - 1;
      if (idx < 0 || idx >= prev.length) return prev;
      return prev.filter((_, i) => i !== idx);
    });
    setSelectedIndex(null);
  };

  const resetForm = () => {
    setError('');
    setSuccess(false);
    setBillNo(getAndSyncNextBillNo());
    setBillDate(new Date().toISOString().slice(0, 10));
    setPartyName('');
    setPhoneNo('');
    setPaymentMethod('Cash');
    setEntry({ itemId: '', quantity: 1, unit: 'PCS', rate: 0, gstPercent: 0 });
    setLines([]);
    setSelectedIndex(null);
  };

  const handlePrint = async () => {
    if (!shopId || lines.length === 0) return;
    setSubmitting(true);
    setError('');
    setSuccess(false);
    try {
      const printedBillNo = billNo || getAndSyncNextBillNo();
      await apiPost('/billing', {
        shopId,
        paymentMethod,
        billNo: printedBillNo,
        billDate,
        partyName: partyName || undefined,
        phoneNo: phoneNo || undefined,
        items: lines.map(({ itemId, quantity, price }) => ({ itemId, quantity, price })),
      });
      commitPrintedBillNo(printedBillNo);
      setBillNo(getAndSyncNextBillNo());
      setSuccess(true);
      window.print();
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Bill No">
                <input
                  value={billNo ? String(billNo) : ''}
                  readOnly
                  className={inputClass}
                />
              </Field>
              <Field label="Date">
                <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className={inputClass} />
              </Field>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button variant="secondary" type="button" onClick={handlePrint} disabled={submitting || lines.length === 0}>
                  {submitting ? 'Printing…' : 'Print'}
                </Button>
                <Button variant="secondary" type="button" onClick={resetForm} disabled={submitting}>
                  Reset
                </Button>
              </div>
              <Field label="Name">
                  <input
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className={inputClass}
                    placeholder="Customer / Party"
                  />
                </Field>
                <Field label="Phone No (optional)">
                  <input
                    value={phoneNo}
                    onChange={(e) => setPhoneNo(e.target.value)}
                    className={inputClass}
                    inputMode="numeric"
                    placeholder="e.g. 9876543210"
                  />
                </Field>
                <Field label="Payment Method">
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (next === 'Cash' || next === 'Card' || next === 'UPI') setPaymentMethod(next);
                    }}
                    className={inputClass}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                  </select>
                </Field>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]">
            <Field label="Item Name">
              <select
                value={entry.itemId}
                onChange={(e) => setEntry((p) => ({ ...p, itemId: e.target.value }))}
                className={inputClass}
                disabled={loading || items.length === 0}
              >
                <option value="">{loading ? 'Loading…' : 'Select item'}</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Qty">
              <input
                type="number"
                min={1}
                value={entry.quantity}
                onChange={(e) => setEntry((p) => ({ ...p, quantity: Number(e.target.value) }))}
                className={inputClass}
              />
            </Field>
            <Field label="Unit">
              <input value={entry.unit} onChange={(e) => setEntry((p) => ({ ...p, unit: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Rate">
              <input
                type="number"
                step="0.01"
                min={0}
                value={entry.rate}
                onChange={(e) => setEntry((p) => ({ ...p, rate: Number(e.target.value) }))}
                className={inputClass}
              />
            </Field>
            <Field label="GST %">
              <input
                type="number"
                step="0.01"
                min={0}
                value={entry.gstPercent}
                onChange={(e) => setEntry((p) => ({ ...p, gstPercent: Number(e.target.value) }))}
                className={inputClass}
              />
            </Field>
            <Field label="Total Amount">
              <input value={entryTotal.toFixed(2)} readOnly className={cx(inputClass, 'bg-cream-dark/20')} />
            </Field>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" type="button" onClick={addEntry} disabled={!entry.itemId}>
              Add
            </Button>
            <Button variant="secondary" type="button" onClick={deleteSelected} disabled={lines.length === 0}>
              Delete
            </Button>
          </div>

          <div className="mt-4">
            <Card className="overflow-hidden">
              <TableWrap>
                <Table>
                  <thead className="bg-cream-dark/50">
                    <tr>
                      <Th>Sl.No</Th>
                      <Th>Item Name</Th>
                      <Th>Qty</Th>
                      <Th>Rate</Th>
                      <Th>Amount</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr className="border-t border-cream-dark/60">
                        <Td colSpan={5} className="text-ink/60">
                          Add items to start billing.
                        </Td>
                      </tr>
                    ) : (
                      lines.map((line, i) => {
                        const it = items.find((x) => x.id === line.itemId);
                        const amount = line.totalAmount ?? line.quantity * line.price;
                        const selected = selectedIndex === i;
                        return (
                          <tr
                            key={`${line.itemId}-${i}`}
                            className={cx(
                              'border-t border-cream-dark/60 cursor-pointer',
                              selected && 'bg-cream-dark/30'
                            )}
                            onClick={() => setSelectedIndex(i)}
                          >
                            <Td>{i + 1}</Td>
                            <Td>{it?.name ?? '—'}</Td>
                            <Td>{line.quantity}</Td>
                            <Td>₹{Number(line.price).toFixed(2)}</Td>
                            <Td>₹{amount.toFixed(2)}</Td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </TableWrap>
            </Card>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-ink/60">
              Total: <span className="font-semibold text-ink">₹{total.toFixed(2)}</span>
            </div>
            <div className="text-xs text-ink/60">
              Tip: click a row to select it for Delete.
            </div>
          </div>
        </Card>
      ) : null}
    </Page>
  );
}
