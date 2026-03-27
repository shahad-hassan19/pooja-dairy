import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

type DuplicateGroup = {
  sku: string;
  count: number;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

function hasApplyFlag(): boolean {
  return process.argv.includes('--apply');
}

async function getDuplicateSkuGroups(): Promise<DuplicateGroup[]> {
  const grouped = await prisma.item.groupBy({
    by: ['sku'],
    _count: { sku: true },
    having: {
      sku: {
        _count: {
          gt: 1,
        },
      },
    },
    orderBy: {
      sku: 'asc',
    },
  });

  return grouped.map((g) => ({ sku: g.sku, count: g._count.sku }));
}

function chooseCanonicalItem(
  items: Array<{
    id: string;
    shopId: string | null;
    shop: { type: 'DISTRIBUTOR' | 'RETAIL' } | null;
  }>,
): string {
  const distributorItem = items.find((i) => i.shop?.type === 'DISTRIBUTOR');
  if (distributorItem) return distributorItem.id;
  return items[0].id;
}

async function run() {
  const apply = hasApplyFlag();
  console.log(
    apply
      ? 'Running DUPLICATE ITEM MERGE in APPLY mode'
      : 'Running DUPLICATE ITEM MERGE in DRY-RUN mode',
  );

  const duplicateGroups = await getDuplicateSkuGroups();
  if (duplicateGroups.length === 0) {
    console.log('No duplicate SKUs found. Nothing to do.');
    return;
  }

  console.log(`Found ${duplicateGroups.length} duplicate SKU group(s).`);

  let totalRowsToDelete = 0;
  let totalStockLogsToMove = 0;
  let totalInvoiceItemsToMove = 0;
  let totalTransferItemsToMove = 0;

  // Avoid a single long interactive transaction (default timeout is 5s).
  // We do reads outside transactions and only wrap each SKU merge in its own transaction.
  for (const group of duplicateGroups) {
    const items = await prisma.item.findMany({
      where: { sku: group.sku },
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        shopId: true,
        shop: { select: { type: true } },
      },
      orderBy: { id: 'asc' },
    });

    const canonicalId = chooseCanonicalItem(items);
    const duplicateIds = items
      .filter((i) => i.id !== canonicalId)
      .map((i) => i.id);

    const nameSet = new Set(items.map((i) => i.name.trim().toLowerCase()));
    const priceSet = new Set(items.map((i) => i.price.toString()));

    if (nameSet.size > 1 || priceSet.size > 1) {
      throw new Error(
        `Conflict for SKU ${group.sku}: different names/prices across duplicates`,
      );
    }

    const [stockLogsCount, invoiceItemsCount, transferItemsCount] =
      await Promise.all([
        prisma.stockLog.count({
          where: { itemId: { in: duplicateIds } },
        }),
        prisma.invoiceItem.count({
          where: { itemId: { in: duplicateIds } },
        }),
        prisma.transferItem.count({
          where: { itemId: { in: duplicateIds } },
        }),
      ]);

    console.log(
      [
        `SKU: ${group.sku}`,
        `canonical: ${canonicalId}`,
        `duplicates: ${duplicateIds.length}`,
        `stockLogs->move: ${stockLogsCount}`,
        `invoiceItems->move: ${invoiceItemsCount}`,
        `transferItems->move: ${transferItemsCount}`,
      ].join(' | '),
    );

    totalRowsToDelete += duplicateIds.length;
    totalStockLogsToMove += stockLogsCount;
    totalInvoiceItemsToMove += invoiceItemsCount;
    totalTransferItemsToMove += transferItemsCount;

    if (!apply) continue;

    await prisma.$transaction(
      async (tx) => {
        await tx.stockLog.updateMany({
          where: { itemId: { in: duplicateIds } },
          data: { itemId: canonicalId },
        });

        await tx.invoiceItem.updateMany({
          where: { itemId: { in: duplicateIds } },
          data: { itemId: canonicalId },
        });

        await tx.transferItem.updateMany({
          where: { itemId: { in: duplicateIds } },
          data: { itemId: canonicalId },
        });

        await tx.item.deleteMany({
          where: { id: { in: duplicateIds } },
        });
      },
      { timeout: 60000 },
    );
  }

  console.log('Done.');
  console.log(`Item rows deleted: ${totalRowsToDelete}`);
  console.log(`StockLog rows moved: ${totalStockLogsToMove}`);
  console.log(`InvoiceItem rows moved: ${totalInvoiceItemsToMove}`);
  console.log(`TransferItem rows moved: ${totalTransferItemsToMove}`);
}

run()
  .catch((error: unknown) => {
    console.error('Duplicate merge failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
