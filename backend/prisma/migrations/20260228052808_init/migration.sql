/*
  Warnings:

  - The primary key for the `AuditLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `AuditLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT NOT NULL;
