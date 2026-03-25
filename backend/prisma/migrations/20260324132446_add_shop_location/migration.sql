-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_shopId_fkey";

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "shopId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "location" TEXT;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
