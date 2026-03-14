import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import { useShop } from '../contexts/useShop';
import type { AuditLogRecord } from '../types';
import { Card } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { Callout, Page, PageHeader } from '../components/ui/Page';
import { Table, TableWrap, Td, Th } from '../components/ui/Table';

export function Audit() {
  const { shopId, shops, setShopId, isAdmin } = useShop();
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
                    <Td className="text-ink/60">{log.entityId ?? '—'}</Td>
                    <Td className="text-ink/60">{log.userId}</Td>
                    <Td className="text-ink/60">{log.shopId}</Td>
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
