-- DropForeignKey
ALTER TABLE "JobOrderItem" DROP CONSTRAINT "JobOrderItem_productId_fkey";

-- AlterTable
ALTER TABLE "JobOrder" ADD COLUMN     "importedAt" TIMESTAMP(3),
ADD COLUMN     "planDateEnd" TIMESTAMP(3),
ADD COLUMN     "planDateStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobOrderItem" ADD COLUMN     "actualDate" TIMESTAMP(3),
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "department" TEXT,
ADD COLUMN     "isLFP" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRush" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lfpHeight" TEXT,
ADD COLUMN     "lfpUnit" TEXT,
ADD COLUMN     "lfpWidth" TEXT,
ADD COLUMN     "lineItemId" TEXT,
ADD COLUMN     "productionStatus" TEXT,
ADD COLUMN     "statusHistory" TEXT,
ADD COLUMN     "waitingPickupSince" TIMESTAMP(3),
ALTER COLUMN "productId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "JobOrderItem_productionStatus_idx" ON "JobOrderItem"("productionStatus");

-- CreateIndex
CREATE INDEX "JobOrderItem_deadline_idx" ON "JobOrderItem"("deadline");

-- CreateIndex
CREATE INDEX "JobOrderItem_archivedAt_idx" ON "JobOrderItem"("archivedAt");

-- CreateIndex
CREATE INDEX "JobOrderItem_lineItemId_idx" ON "JobOrderItem"("lineItemId");

-- AddForeignKey
ALTER TABLE "JobOrderItem" ADD CONSTRAINT "JobOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
