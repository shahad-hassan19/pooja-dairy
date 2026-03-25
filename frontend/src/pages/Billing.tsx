import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../api/client';
import { useShop } from '../contexts/useShop';
import type { Item } from '../types';
import type { InvoiceItemInput } from '../types';
import { cx } from '../lib/cx';
import { Page } from '../components/ui/Page';
import './Billing.css';

type PaymentMethod = 'Cash' | 'Card' | 'UPI';
type BillCounterState = { date: string; seq: number };

/* ── Reusable class strings ──────────────────────────────────── */
const inputLight = [
  'w-full text-sm text-neutral-800',
  'bg-stone-50 border border-stone-200 rounded-lg',
  'px-3 py-2.5 outline-none',
  'focus:border-neutral-700 focus:bg-white',
  'transition-colors placeholder-stone-400',
].join(' ');

const inputDark = [
  'w-full text-sm text-stone-300',
  'bg-neutral-800 border border-neutral-700 rounded-lg',
  'px-3 py-2.5 outline-none',
  'focus:border-orange-600',
  'transition-colors placeholder-neutral-600',
].join(' ');

const labelClass = 'block mb-1.5 text-[10px] uppercase tracking-widest text-stone-700 font-medium';
const labelDarkClass = 'block mb-1.5 text-[10px] uppercase tracking-widest text-neutral-300 font-medium';

/* ── Thermal Receipt (hidden on screen, visible only when printing) ── */
function ThermalReceipt({
  billNo, billDate, shopName, partyName, phoneNo, paymentMethod, lines, items, total,
}: {
  billNo: number; billDate: string; shopName: string;
  partyName: string; phoneNo: string; paymentMethod: string;
  lines: Array<InvoiceItemInput & { unit?: string; gstPercent?: number; totalAmount?: number }>;
  items: Item[]; total: number;
}) {
  const dateStr = new Date(billDate + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const totalGst = lines.reduce((s, l) => {
    const base = l.quantity * l.price;
    return s + base * ((l.gstPercent ?? 0) / 100);
  }, 0);
  const subTotal = total - totalGst;

  return (
    <div id="thermal-receipt" className="thermal-receipt">
      {/* Header */}
      <div className="receipt-header">
        <div className="receipt-brand">Pooja Dairy</div>
        <div className="receipt-shop">{shopName}</div>
        <div className="receipt-address">B-12, Sector 63, Noida, UP 201301</div>
        <div className="receipt-address">Ph: +91 98765 43210</div>
        <div className="receipt-address">GSTIN: 09ABCDE1234F1Z5</div>
      </div>

      <div className="receipt-divider">{'─'.repeat(48)}</div>

      {/* Bill info */}
      <div className="receipt-meta">
        <div className="receipt-meta-row">
          <span>Bill No:</span>
          <span>#{String(billNo).padStart(4, '0')}</span>
        </div>
        <div className="receipt-meta-row">
          <span>Date:</span>
          <span>{dateStr} {timeStr}</span>
        </div>
        {partyName && (
          <div className="receipt-meta-row">
            <span>Customer:</span>
            <span>{partyName}</span>
          </div>
        )}
        {phoneNo && (
          <div className="receipt-meta-row">
            <span>Phone:</span>
            <span>{phoneNo}</span>
          </div>
        )}
      </div>

      <div className="receipt-divider">{'─'.repeat(48)}</div>

      {/* Items table */}
      <table className="receipt-table">
        <thead>
          <tr>
            <th className="receipt-th-left">Item</th>
            <th className="receipt-th-right">Qty</th>
            <th className="receipt-th-right">Rate</th>
            <th className="receipt-th-right">Amt</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => {
            const it = items.find((x) => x.id === line.itemId);
            const amount = line.totalAmount ?? line.quantity * line.price;
            return (
              <tr key={i}>
                <td className="receipt-td-left">{it?.name ?? '—'}</td>
                <td className="receipt-td-right">{line.quantity}</td>
                <td className="receipt-td-right">{Number(line.price).toFixed(0)}</td>
                <td className="receipt-td-right">{amount.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="receipt-divider">{'─'.repeat(48)}</div>

      {/* Totals */}
      <div className="receipt-totals">
        {totalGst > 0 && (
          <>
            <div className="receipt-meta-row">
              <span>Sub Total:</span>
              <span>₹{subTotal.toFixed(2)}</span>
            </div>
            <div className="receipt-meta-row">
              <span>GST:</span>
              <span>₹{totalGst.toFixed(2)}</span>
            </div>
          </>
        )}
        <div className="receipt-grand-total">
          <span>TOTAL</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
      </div>

      <div className="receipt-divider">{'─'.repeat(48)}</div>

      {/* Payment */}
      <div className="receipt-payment">
        Paid via {paymentMethod}
      </div>

      {/* Footer */}
      <div className="receipt-footer">
        <div>Thank you for shopping with us!</div>
        <div className="receipt-footer-sub">Goods once sold will not be returned or exchanged.</div>
        <div className="receipt-footer-sub" style={{ marginTop: '1mm' }}>www.poojadairy.in · +91 98765 43210</div>
      </div>

      <div className="receipt-cut">✂{'┈'.repeat(23)}</div>
    </div>
  );
}

export function Billing() {
  const { shopId, shops, setShopId, isAdmin } = useShop();

  const [items, setItems]       = useState<Item[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]   = useState(false);

  const billCounterKey = useMemo(
    () => `pooja-billing:billCounter:${shopId ?? 'no-shop'}`,
    [shopId],
  );
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [billNo, setBillNo]         = useState<number>(0);
  const [billDate, setBillDate]     = useState(() => new Date().toISOString().slice(0, 10));
  const [partyName, setPartyName]   = useState('');
  const [phoneNo, setPhoneNo]       = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');

  const [entry, setEntry] = useState<{
    itemId: string; quantity: number; unit: string; rate: number; gstPercent: number;
  }>({ itemId: '', quantity: 1, unit: 'PCS', rate: 0, gstPercent: 0 });

  const [lines, setLines] = useState<
    Array<InvoiceItemInput & { unit?: string; gstPercent?: number; totalAmount?: number }>
  >([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  /* ── Helpers ── */
  const computeLineTotal = (qty: number, rate: number, gst: number) => {
    const base = Number(qty || 0) * Number(rate || 0);
    return base + base * (Number(gst || 0) / 100);
  };

  const getAndSyncNextBillNo = () => {
    if (!shopId) return 0;
    const raw = localStorage.getItem(billCounterKey);
    let state: BillCounterState = { date: todayKey, seq: 0 };
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<BillCounterState>;
        if (typeof parsed.seq === 'number' && typeof parsed.date === 'string') {
          state = parsed.date === todayKey
            ? { date: parsed.date, seq: parsed.seq }
            : { date: todayKey, seq: 0 };
        }
      } catch { state = { date: todayKey, seq: 0 }; }
    }
    localStorage.setItem(billCounterKey, JSON.stringify(state));
    return state.seq + 1;
  };

  const commitPrintedBillNo = (n: number) => {
    if (!shopId) return;
    localStorage.setItem(billCounterKey, JSON.stringify({ date: todayKey, seq: n }));
  };

  /* ── Effects ── */
  useEffect(() => {
    if (!shopId) { setItems([]); return; }
    setLoading(true);
    apiGet<Item[]>(`/inventory/${shopId}/items`)
      .then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [shopId]);

  useEffect(() => {
    if (!shopId) { setBillNo(0); return; }
    setBillNo(getAndSyncNextBillNo());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, billCounterKey]);

  useEffect(() => {
    if (!entry.itemId) return;
    const it = items.find((i) => i.id === entry.itemId);
    if (it) setEntry((p) => ({ ...p, rate: Number(it.price) }));
  }, [entry.itemId, items]);

  /* ── Derived ── */
  const entryTotal = useMemo(
    () => computeLineTotal(entry.quantity, entry.rate, entry.gstPercent),
    [entry.quantity, entry.rate, entry.gstPercent],
  );

  const total = useMemo(
    () => lines.reduce((s, l) => s + (l.totalAmount ?? l.quantity * l.price), 0),
    [lines],
  );

  /* ── Actions ── */
  const addEntry = () => {
    if (!entry.itemId || !entry.quantity || entry.quantity <= 0) return;
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.itemId === entry.itemId);
      if (idx === -1) {
        return [...prev, {
          itemId: entry.itemId, quantity: Number(entry.quantity),
          price: Number(entry.rate), unit: entry.unit,
          gstPercent: Number(entry.gstPercent), totalAmount: entryTotal,
        }];
      }
      const next = [...prev];
      const cur = next[idx];
      const qty = Number(cur.quantity) + Number(entry.quantity);
      next[idx] = {
        ...cur, quantity: qty, price: Number(entry.rate),
        unit: entry.unit, gstPercent: Number(entry.gstPercent),
        totalAmount: computeLineTotal(qty, Number(entry.rate), Number(entry.gstPercent)),
      };
      return next;
    });
    setSelectedIndex(null);
  };

  const deleteSelected = () => {
    setLines((prev) => {
      if (!prev.length) return prev;
      const idx = selectedIndex ?? prev.length - 1;
      return prev.filter((_, i) => i !== idx);
    });
    setSelectedIndex(null);
  };

  const resetForm = () => {
    setError(''); setSuccess(false);
    setBillNo(getAndSyncNextBillNo());
    setBillDate(new Date().toISOString().slice(0, 10));
    setPartyName(''); setPhoneNo(''); setPaymentMethod('Cash');
    setEntry({ itemId: '', quantity: 1, unit: 'PCS', rate: 0, gstPercent: 0 });
    setLines([]); setSelectedIndex(null);
  };

  const handlePrint = async () => {
    if (!shopId || !lines.length) return;
    setSubmitting(true); setError(''); setSuccess(false);
    try {
      const n = billNo || getAndSyncNextBillNo();
      await apiPost('/billing', {
        shopId, paymentMethod, billNo: n, billDate,
        partyName: partyName || undefined, phoneNo: phoneNo || undefined,
        items: lines.map(({ itemId, quantity, price }) => ({ itemId, quantity, price })),
      });
      commitPrintedBillNo(n);
      setBillNo(getAndSyncNextBillNo());
      setSuccess(true);
      window.print();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  /* ────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────── */
  return (
    <Page className="min-h-screen bg-stone-100 font-sans">

      {/* ══════════ TOP BAR ══════════ */}
      <header className="flex items-center justify-between gap-4 border-b border-stone-200 bg-white px-6 py-3">

        <div className="flex items-center gap-3">
          {/* Bill number badge */}
          <div className="flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            <span className="font-mono text-xs tracking-widest text-white">
              INV #{billNo ? String(billNo).padStart(4, '0') : '——'}
            </span>
          </div>

          {/* Date */}
          <input
            type="date"
            value={billDate}
            onChange={(e) => setBillDate(e.target.value)}
            className="rounded-lg border border-stone-200 bg-transparent px-3 py-1.5 font-mono text-xs text-stone-500 outline-none transition-colors focus:border-neutral-700"
          />

          {/* Shop selector */}
          {isAdmin && shops.length > 0 && (
            <select
              value={shopId || ''}
              onChange={(e) => setShopId(e.target.value)}
              className="min-w-[180px] rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-neutral-800 outline-none focus:border-neutral-700"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetForm}
            disabled={submitting}
            className="rounded-lg border border-stone-200 bg-transparent px-4 py-2 text-xs font-semibold tracking-wide text-stone-500 transition-colors hover:border-neutral-700 hover:text-neutral-900 disabled:opacity-40"
          >
            Reset
          </button>
          <button
            onClick={handlePrint}
            disabled={submitting || !lines.length}
            className="flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2 text-xs font-bold tracking-wide text-white transition-colors hover:bg-orange-700 disabled:opacity-40"
          >
            {submitting ? 'Printing…' : '⌘ Print Invoice'}
          </button>
        </div>
      </header>

      {/* ══════════ CALLOUTS ══════════ */}
      <div className="px-6">
        {error && (
          <div className="my-4 rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="my-4 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Invoice created successfully.
          </div>
        )}
        {!shopId && !isAdmin && (
          <div className="my-4 rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
            No shop assigned to your account.
          </div>
        )}
      </div>

      {/* ══════════ BODY — two-column split ══════════ */}
      {shopId && (
        <div className="flex" style={{ minHeight: 'calc(100vh - 100px)' }}>

          {/* ─── LEFT PANEL — white, billing items ─── */}
          <main className="flex flex-1 flex-col overflow-hidden bg-white">

            {/* Section label */}
            <div className="border-b border-stone-100 px-8 pb-4 pt-7">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-700">
                  Line Items
                </span>
                <span className="h-px flex-1 bg-stone-400" />
              </div>
            </div>

            {/* ── Entry row ── */}
            <div className="border-b border-stone-100 px-8 py-5">
              <div className="grid items-end gap-2.5"
                style={{ gridTemplateColumns: '2fr 72px 72px 110px 88px 120px 42px' }}>

                {/* Item */}
                <div>
                  <label className={labelClass}>Item</label>
                  <select
                    value={entry.itemId}
                    onChange={(e) => setEntry((p) => ({ ...p, itemId: e.target.value }))}
                    className={inputLight}
                    disabled={loading || items.length === 0}
                  >
                    <option value="">{loading ? 'Loading…' : 'Select item'}</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>{it.name}</option>
                    ))}
                  </select>
                </div>

                {/* Qty */}
                <div>
                  <label className={labelClass}>Qty</label>
                  <input
                    type="number" min={1}
                    value={entry.quantity}
                    onChange={(e) => setEntry((p) => ({ ...p, quantity: Number(e.target.value) }))}
                    className={inputLight}
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className={labelClass}>Unit</label>
                  <input
                    value={entry.unit}
                    onChange={(e) => setEntry((p) => ({ ...p, unit: e.target.value }))}
                    className={inputLight}
                  />
                </div>

                {/* Rate */}
                <div>
                  <label className={labelClass}>Rate ₹</label>
                  <input
                    type="number" step="0.01" min={0}
                    value={entry.rate}
                    onChange={(e) => setEntry((p) => ({ ...p, rate: Number(e.target.value) }))}
                    className={inputLight}
                  />
                </div>

                {/* GST */}
                <div>
                  <label className={labelClass}>GST %</label>
                  <input
                    type="number" step="0.01" min={0}
                    value={entry.gstPercent}
                    onChange={(e) => setEntry((p) => ({ ...p, gstPercent: Number(e.target.value) }))}
                    className={inputLight}
                  />
                </div>

                {/* Total read-only */}
                <div>
                  <label className={labelClass}>Total</label>
                  <input
                    value={`₹${entryTotal.toFixed(2)}`}
                    readOnly
                    className="w-full rounded-lg border border-transparent bg-orange-50 px-3 py-2.5 font-mono text-sm font-medium text-orange-700 outline-none"
                  />
                </div>

                {/* Add button */}
                <div>
                  <label className="invisible mb-1.5 block text-[10px]">Add</label>
                  <button
                    onClick={addEntry}
                    disabled={!entry.itemId}
                    className="flex h-[42px] w-full items-center justify-center rounded-lg bg-neutral-900 text-xl text-white transition-colors hover:bg-orange-700 disabled:opacity-30"
                    title="Add item"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* ── Invoice table ── */}
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-stone-100">
                    {[
                      { label: '#',      cls: 'w-12 pl-8 text-left' },
                      { label: 'Item',   cls: 'px-4 text-left' },
                      { label: 'Unit',   cls: 'px-4 text-left' },
                      { label: 'Qty',    cls: 'px-4 text-left' },
                      { label: 'Rate',   cls: 'px-4 text-left' },
                      { label: 'Amount', cls: 'pr-8 text-right' },
                    ].map(({ label, cls }) => (
                      <th
                        key={label}
                        className={cx(
                          'sticky top-0 z-10 bg-white py-3 font-mono text-[10px] uppercase tracking-widest text-stone-400',
                          cls,
                        )}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <span className="block text-4xl opacity-20">🧾</span>
                        <span className="mt-2 block font-mono text-xs text-stone-400">
                          No items added yet
                        </span>
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, i) => {
                      const it = items.find((x) => x.id === line.itemId);
                      const amount = line.totalAmount ?? line.quantity * line.price;
                      const isSelected = selectedIndex === i;
                      return (
                        <tr
                          key={`${line.itemId}-${i}`}
                          onClick={() => setSelectedIndex(i)}
                          className={cx(
                            'cursor-pointer border-b border-stone-50 transition-colors',
                            isSelected
                              ? 'bg-orange-50'
                              : 'hover:bg-stone-50',
                          )}
                        >
                          <td className="py-3.5 pl-8 font-mono text-xs text-stone-400">{i + 1}</td>
                          <td className="px-4 py-3.5 text-sm font-medium text-neutral-800">
                            {it?.name ?? '—'}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-stone-500">
                            {line.unit ?? '—'}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-stone-600">
                            {line.quantity}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-stone-600">
                            ₹{Number(line.price).toFixed(2)}
                          </td>
                          <td className="py-3.5 pr-8 text-right font-mono text-sm font-semibold text-neutral-800">
                            ₹{amount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Bottom bar ── */}
            <div className="flex items-center justify-between border-t border-stone-100 px-8 py-4">
              <span className="font-mono text-xs text-stone-400">
                {selectedIndex !== null
                  ? `Row ${selectedIndex + 1} selected — click Delete to remove`
                  : 'Click a row to select it'}
              </span>
              <button
                onClick={deleteSelected}
                disabled={lines.length === 0}
                className="rounded-lg border border-red-100 bg-red-50 px-4 py-2 font-mono text-xs text-red-600 transition-colors hover:border-red-500 hover:bg-red-600 hover:text-white disabled:opacity-30"
              >
                Delete {selectedIndex !== null ? `#${selectedIndex + 1}` : 'Last'}
              </button>
            </div>
          </main>

          {/* ─── RIGHT PANEL — dark, customer details ─── */}
          <aside className="flex w-72 shrink-0 flex-col gap-0 bg-neutral-900 p-7 xl:w-80">

            {/* Section label */}
            <div className="mb-6 flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-300">
                Customer
              </span>
              <span className="h-px flex-1 bg-neutral-500" />
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className={labelDarkClass}>Name</label>
              <input
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="Party or customer"
                className={inputDark}
              />
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label className={labelDarkClass}>Phone</label>
              <input
                value={phoneNo}
                onChange={(e) => setPhoneNo(e.target.value)}
                placeholder="Optional"
                inputMode="numeric"
                className={inputDark}
              />
            </div>

            {/* Payment method */}
            <div className="mb-4">
              <label className={labelDarkClass} style={{ marginBottom: '0.75rem' }}>
                Payment
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'Card', 'UPI'] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={cx(
                      'flex flex-col items-center gap-1 rounded-lg border py-3 font-mono text-xs transition-all',
                      paymentMethod === m
                        ? 'border-orange-600 bg-orange-600/10 text-orange-500'
                        : 'border-neutral-800 bg-neutral-800/50 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300',
                    )}
                  >
                    <span className="text-base leading-none">
                      {m === 'Cash' ? '💵' : m === 'Card' ? '💳' : '📱'}
                    </span>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="mt-auto border-t border-neutral-800 pt-7">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-300">
                Invoice Total
              </p>
              <p className="text-4xl font-extrabold leading-none text-stone-100">
                <span className="text-xl text-orange-500">₹</span>
                {total.toFixed(2)}
              </p>
              <p className="mt-3 font-mono text-xs text-neutral-300">
                {lines.length} line{lines.length !== 1 ? 's' : ''} · {paymentMethod}
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* Thermal receipt — hidden on screen, shown only when printing */}
      <ThermalReceipt
        billNo={billNo}
        billDate={billDate}
        shopName={shops.find((s) => s.id === shopId)?.name ?? 'Pooja Dairy'}
        partyName={partyName}
        phoneNo={phoneNo}
        paymentMethod={paymentMethod}
        lines={lines}
        items={items}
        total={total}
      />
    </Page>
  );
}