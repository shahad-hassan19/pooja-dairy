import { useAuth } from '../auth/useAuth';
import { Card } from '../components/ui/Card';
import { Page, PageHeader } from '../components/ui/Page';

export function Dashboard() {
  const { user } = useAuth();

  return (
    <Page className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back. You're signed in as ${user?.role}.`}
      />

      <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-ink">Quick start</div>
              <p className="mt-1 text-sm text-ink/60">
                Use the sidebar to open Inventory, Billing, Transfers, or Reports based on your role.
              </p>
            </div>
            <span className="shrink-0 rounded-xl border border-brand/20 bg-brand-soft/50 px-3 py-1.5 text-xs font-semibold text-brand">
              Tips
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold text-ink">Pooja Dairy</div>
          <p className="mt-1 text-sm text-ink/60">
            Dairy management made simple—inventory, billing, transfers, and reports in one place.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-ink/50">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Farm-fresh theme
          </div>
        </Card>

        <Card className="p-5 sm:col-span-2 xl:col-span-1">
          <div className="text-sm font-semibold text-ink">Keyboard-friendly</div>
          <p className="mt-1 text-sm text-ink/60">
            Focus rings and large tap targets are baked into buttons, inputs, and navigation.
          </p>
        </Card>
      </div>
    </Page>
  );
}
