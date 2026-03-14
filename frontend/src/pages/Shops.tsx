import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '../api/client';
import type { Shop } from '../types';
import type { ShopType } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { Callout, Page, PageHeader } from '../components/ui/Page';
import { Table, TableWrap, Td, Th } from '../components/ui/Table';

export function Shops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<ShopType>('RETAIL');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    apiGet<Shop[]>('/shops')
      .then(setShops)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await apiPost<Shop>('/shops', { name, type });
      setName('');
      setType('RETAIL');
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create shop');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this shop? This may fail if it has related data.')) return;
    setError('');
    try {
      await apiDelete(`/shops/${id}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <Page className="space-y-6">
      <PageHeader
        title="Shops"
        description="Manage distributor and retail shops."
        right={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Add shop
          </Button>
        }
      />

      {error ? <Callout tone="danger">{error}</Callout> : null}

      {showForm ? (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">New shop</div>
              <div className="mt-1 text-xs text-ink/60">Create a retail or distributor shop.</div>
            </div>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Close
            </Button>
          </div>

          <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Shop name"
                className={inputClass}
              />
            </Field>
            <Field label="Type">
              <select value={type} onChange={(e) => setType(e.target.value as ShopType)} className={inputClass}>
                <option value="RETAIL">Retail</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </select>
            </Field>

            <div className="sm:col-span-2 flex flex-wrap items-center justify-end gap-2 pt-1">
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-ink/60">Loading…</div>
        ) : shops.length === 0 ? (
          <div className="p-6 text-sm text-ink/60">
            No shops yet. Create your first one to start managing users and inventory.
          </div>
        ) : (
          <TableWrap>
            <Table>
              <thead className="bg-cream-dark/50">
                <tr>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Created</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {shops.map((s) => (
                  <tr key={s.id} className="border-t border-cream-dark/60 hover:bg-cream-dark/40">
                    <Td className="font-medium">{s.name}</Td>
                    <Td>
                      <span className="inline-flex items-center rounded-full bg-cream-dark/50 px-2.5 py-1 text-xs ring-1 ring-cream-dark/60">
                        {s.type}
                      </span>
                    </Td>
                    <Td className="text-ink/60">{new Date(s.createdAt).toLocaleDateString()}</Td>
                    <Td className="text-right">
                      <Button variant="danger" size="sm" type="button" onClick={() => handleDelete(s.id)}>
                        Delete
                      </Button>
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
