-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "status" "TransferStatus" NOT NULL DEFAULT 'PENDING';
