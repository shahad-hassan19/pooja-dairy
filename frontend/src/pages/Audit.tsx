import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { useShop } from '../contexts/useShop';
import type { AuditLogRecord, Item, User } from '../types';
import { Card } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { Callout, Page, PageHeader } from '../components/ui/Page';
import { Table, TableWrap, Td, Th } from '../components/ui/Table';

function shortId(id: string) {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function Audit() {
  const { shopId, shops, setShopId, isAdmin } = useShop();
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userNameById, setUserNameById] = useState<Record<string, string>>({});
  const [itemNameById, setItemNameById] = useState<Record<string, string>>({});

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
    })().catch(() => {
      // Best-effort name lookups; fall back to raw IDs if unavailable.
    });

    return () => {
      cancelled = true;
    };
  }, [logs, userNameById, itemNameById, isAdmin]);

  return (
    <Page className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Activity history for the selected scope."
        right={
          isAdmin && shops.length > 0 ? (
            <div className="min-w-[260px]">
              <Field label="Scope">
                <select
                  value={shopId ? shopId : '__all__'}
                  onChange={(e) => setShopId(e.target.value === '__all__' ? '' : e.target.value)}
                  className={inputClass}
                >
                  <option value="__all__">All shops</option>
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

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-ink/60">Loading…</div>
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
                  <tr key={log.id} className="border-t border-cream-dark/60 hover:bg-cream-dark/40">
                    <Td className="text-ink/60">{new Date(log.createdAt).toLocaleString()}</Td>
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
    </Page>
  );
}
