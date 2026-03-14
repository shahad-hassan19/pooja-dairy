import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '../api/client';
import { useShop } from '../contexts/useShop';
import type { User } from '../types';
import type { Role } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { Callout, Page, PageHeader } from '../components/ui/Page';
import { Table, TableWrap, Td, Th } from '../components/ui/Table';

const ROLES: Role[] = ['ADMIN', 'SALES', 'STOCK_MANAGER', 'ACCOUNTS'];

export function Users() {
  const { shopId, shops, setShopId, isAdmin } = useShop();
  const [users, setUsers] = useState<(User & { createdAt: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('SALES');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    if (!shopId) return;
    setLoading(true);
    setError('');
    apiGet<(User & { createdAt: string })[]>(`/users/${shopId}`)
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [shopId]);

  useEffect(() => {
    if (shopId) load();
    else setUsers([]);
  }, [load, shopId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    setSubmitting(true);
    setError('');
    try {
      await apiPost('/users', { name, email, password, role, shopId });
      setName('');
      setEmail('');
      setPassword('');
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage users for the selected shop."
        right={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {isAdmin && shops.length > 0 ? (
              <div className="min-w-[220px]">
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
              <Button variant="primary" onClick={() => setShowForm(true)}>
                Add user
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? <Callout tone="danger">{error}</Callout> : null}

      {!shopId && !isAdmin ? <Callout tone="danger">No shop assigned.</Callout> : null}

      {showForm && shopId ? (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">New user</div>
              <div className="mt-1 text-xs text-ink/60">Create a user for the selected shop.</div>
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
                placeholder="Full name"
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@example.com"
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Password" hint="Min 6 characters">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Role">
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
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

      {shopId ? (
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-ink/60">Loading…</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-sm text-ink/60">No users found for this shop.</div>
          ) : (
            <TableWrap>
              <Table>
                <thead className="bg-cream-dark/50">
                  <tr>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Role</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-cream-dark/60 hover:bg-cream-dark/40">
                      <Td className="font-medium">{u.name}</Td>
                      <Td className="text-ink/60">{u.email}</Td>
                      <Td>
                        <span className="inline-flex items-center rounded-full bg-cream-dark/50 px-2.5 py-1 text-xs ring-1 ring-cream-dark/60">
                          {u.role}
                        </span>
                      </Td>
                      <Td className="text-ink/60">{new Date(u.createdAt).toLocaleDateString()}</Td>
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
