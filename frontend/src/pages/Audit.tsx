import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { useShop } from '../contexts/useShop';
import type { AuditLogRecord, Item, User } from '../types';
import { Card } from '../components/ui/Card';
import { Callout, Page } from '../components/ui/Page';
import { Field, inputClass } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { Table, TableWrap, Td, Th } from '../components/ui/Table';
import { Skeleton } from '../components/ui/Skeleton';

function shortId(id: string) {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

const TABS = [
  { key: 'LOGS' as const, label: 'Audit logs' },
  { key: 'STOCK' as const, label: 'Stock audit' },
];

export function Audit() {
  const { shopId, shops, setShopId, isAdmin } = useShop();
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userNameById, setUserNameById] = useState<Record<string, string>>({});
  const [itemNameById, setItemNameById] = useState<Record<string, string>>({});
  const [auditDistributorId, setAuditDistributorId] = useState('');
  const [auditRetailId, setAuditRetailId] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditRows, setAuditRows] = useState<
    { itemId: string; name: string; distributorStock: number; retailStock: number }[]
  >([]);
  const [activeTab, setActiveTab] = useState<'LOGS' | 'STOCK'>('LOGS');

  const distributors = shops.filter((s) => s.type === 'DISTRIBUTOR');

  useEffect(() => {
    let cancelled = false;

    const begin = () => {
      if (cancelled) return;
      setLoading(true);
      setError('');
    };

    const end = () => {
      if (cancelled) return;
      setLoading(false);
    };

    if (isAdmin && !shopId) {
      queueMicrotask(begin);
      apiGet<AuditLogRecord[]>('/audit')
        .then((rows) => {
          if (cancelled) return;
          setLogs(rows);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          setError(e instanceof Error ? e.message : 'Failed to load audit log.');
        })
        .finally(end);
      return () => {
        cancelled = true;
      };
    }
    if (shopId) {
      queueMicrotask(begin);
      apiGet<AuditLogRecord[]>(`/audit/${shopId}`)
        .then((rows) => {
          if (cancelled) return;
          setLogs(rows);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          setError(e instanceof Error ? e.message : 'Failed to load audit log.');
        })
        .finally(end);
    } else {
      queueMicrotask(() => {
        if (cancelled) return;
        setLogs([]);
        setLoading(false);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [shopId, isAdmin]);

  useEffect(() => {
    let cancelled = false;

    const shopIds = Array.from(new Set(logs.map((l) => l.shopId).filter(Boolean)));
    if (shopIds.length === 0) return () => {};

    const needsAnyUserLookup = isAdmin && logs.some((l) => !userNameById[l.userId]);
    const needsAnyItemLookup = logs.some(
      (l) => l.entity === 'Item' && l.entityId && !itemNameById[l.entityId],
    );
    if (!needsAnyUserLookup && !needsAnyItemLookup) return () => {};

    (async () => {
      const nextUsers: Record<string, string> = {};
      const nextItems: Record<string, string> = {};

      for (const sid of shopIds) {
        if (cancelled) return;

        if (needsAnyUserLookup) {
          const users = await apiGet<(User & { createdAt: string })[]>(`/users/${sid}`);
          for (const u of users) nextUsers[u.id] = u.name;
        }

        if (needsAnyItemLookup) {
          const items = await apiGet<Item[]>(`/inventory/${sid}/items`);
          for (const it of items) nextItems[it.id] = it.name;
        }
      }

      if (cancelled) return;
      if (Object.keys(nextUsers).length > 0) {
        setUserNameById((prev) => ({ ...prev, ...nextUsers }));
      }
      if (Object.keys(nextItems).length > 0) {
        setItemNameById((prev) => ({ ...prev, ...nextItems }));
      }
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [logs, userNameById, itemNameById, isAdmin]);

  const loadAuditSnapshot = async () => {
    if (!auditDistributorId || !auditRetailId) return;
    setAuditLoading(true);
    setError('');
    try {
      type StockRow = Item & { currentStock: number };
      const [distStock, retailStock] = await Promise.all([
        apiGet<StockRow[]>(`/inventory/${auditDistributorId}/stock`),
        apiGet<StockRow[]>(`/inventory/${auditRetailId}/stock`),
      ]);

      const byId: Record<
        string,
        { name: string; distributorStock: number; retailStock: number }
      > = {};

      for (const row of distStock) {
        byId[row.id] = {
          name: row.name,
          distributorStock: row.currentStock,
          retailStock: 0,
        };
      }

      for (const row of retailStock) {
        const existing = byId[row.id];
        if (existing) {
          existing.retailStock = row.currentStock;
        } else {
          byId[row.id] = {
            name: row.name,
            distributorStock: 0,
            retailStock: row.currentStock,
          };
        }
      }

      const rows = Object.entries(byId)
        .map(([itemId, v]) => ({
          itemId,
          name: v.name,
          distributorStock: v.distributorStock,
          retailStock: v.retailStock,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setAuditRows(rows);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to load stock snapshot for audit',
      );
      setAuditRows([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const pillStyle = (active: boolean): React.CSSProperties => ({
    borderRadius: '9999px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: active ? 'var(--color-ink, #1a1a1a)' : 'rgba(0,0,0,0.06)',
    color: active ? '#fff' : 'rgba(0,0,0,0.55)',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
  });

  return (
    <Page className="space-y-6">
      {isAdmin && (
        <div
          style={{
            display: 'inline-flex',
            position: 'relative',
            background: 'rgba(0,0,0,0.06)',
            borderRadius: '10px',
            padding: '4px',
          }}
        >
          {/* Sliding indicator */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: '4px',
              bottom: '4px',
              width: `calc((100% - 8px) / ${TABS.length})`,
              left:
                activeTab === 'LOGS'
                  ? '4px'
                  : `calc(4px + ((100% - 8px) / ${TABS.length}))`,
              background: 'var(--color-ink, #1a1a1a)',
              borderRadius: '7px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
              transition: 'left 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 0,
            }}
          />
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                position: 'relative',
                zIndex: 1,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '6px 20px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '7px',
                color: activeTab === tab.key ? '#fff' : 'rgba(0,0,0,0.52)',
                transition: 'color 0.18s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}


      {activeTab === 'LOGS' && (
        <>
          {isAdmin && shops.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShopId('')} style={pillStyle(!shopId)}>
                All
              </button>
              {shops
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setShopId(s.id)}
                    style={pillStyle(shopId === s.id)}
                  >
                    {s.name}
                  </button>
                ))}
            </div>
          ) : null}

          {error ? <Callout tone="danger">{error}</Callout> : null}

          <Card className="overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-40" />
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-6 text-sm text-ink/60">No audit entries.</div>
            ) : (
              <TableWrap>
                <Table>
                  <thead className="bg-cream-dark/50">
                    <tr>
                      <Th>Time</Th>
                      <Th>Action</Th>
                      <Th>Entity</Th>
                      <Th>Entity ID</Th>
                      <Th>User</Th>
                      <Th>Shop</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-t border-cream-dark/60 hover:bg-cream-dark/40"
                      >
                        <Td className="text-ink/60">
                          {new Date(log.createdAt).toLocaleString()}
                        </Td>
                        <Td className="font-medium">{log.action}</Td>
                        <Td className="text-ink/60">{log.entity}</Td>
                        <Td className="text-ink/60" title={log.entityId ?? undefined}>
                          {log.entityId
                            ? log.entity === 'Item'
                              ? itemNameById[log.entityId] ?? shortId(log.entityId)
                              : log.entity === 'User'
                                ? userNameById[log.entityId] ?? shortId(log.entityId)
                                : shortId(log.entityId)
                            : '—'}
                        </Td>
                        <Td className="text-ink/60" title={log.userId}>
                          {userNameById[log.userId] ?? shortId(log.userId)}
                        </Td>
                        <Td className="text-ink/60" title={log.shopId}>
                          {shops.find((s) => s.id === log.shopId)?.name ?? shortId(log.shopId)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </Card>
        </>
      )}

      {isAdmin && activeTab === 'STOCK' && (
        <Card className="p-4 space-y-3">
          <div className="text-sm font-semibold text-ink">
            Stock audit (distributor vs retail)
          </div>
            <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Distributor">
              <select
                value={auditDistributorId}
                onChange={(e) => setAuditDistributorId(e.target.value)}
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
            <Field label="Retail shop">
              <select
                value={auditRetailId}
                onChange={(e) => setAuditRetailId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select retail shop</option>
                {shops
                  .filter((s) => s.type === 'RETAIL')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="flex items-end justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={loadAuditSnapshot}
                disabled={!auditDistributorId || !auditRetailId || auditLoading}
              >
                {auditLoading ? 'Loading…' : 'Load snapshot'}
              </Button>
            </div>
          </div>
          {auditRows.length === 0 ? (
            <div className="text-xs text-ink/60">
              Select a distributor and retail shop to see stock per item.
            </div>
          ) : (
            <Card className="overflow-hidden">
              <TableWrap>
                <Table>
                  <thead className="bg-cream-dark/50">
                    <tr>
                      <th className="text-left px-2 py-1 font-medium text-ink/70">Item</th>
                      <th className="text-right px-2 py-1 font-medium text-ink/70">
                        Distributor stock
                      </th>
                      <th className="text-right px-2 py-1 font-medium text-ink/70">
                        Retail stock
                      </th>
                      <th className="text-right px-2 py-1 font-medium text-ink/70">
                        Difference
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRows.map((row) => (
                      <tr key={row.itemId} className="border-t border-cream-dark/60">
                        <td className="px-2 py-1 text-ink">{row.name}</td>
                        <td className="px-2 py-1 text-right text-ink">
                          {row.distributorStock}
                        </td>
                        <td className="px-2 py-1 text-right text-ink">
                          {row.retailStock}
                        </td>
                        <td className="px-2 py-1 text-right text-ink">
                          {row.distributorStock - row.retailStock}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </Card>
          )}
        </Card>
      )}
    </Page>
  );
}
