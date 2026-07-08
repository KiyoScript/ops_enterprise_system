-- CreateEnum
CREATE TYPE "LookupType" AS ENUM ('JO_STATUS', 'JO_EMPLOYEE', 'JO_CATEGORY');

-- CreateTable
CREATE TABLE "LookupOption" (
    "id" TEXT NOT NULL,
    "type" "LookupType" NOT NULL,
    "label" TEXT NOT NULL,
    "isLFP" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "LookupOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LookupOption_type_isActive_idx" ON "LookupOption"("type", "isActive");

-- CreateIndex
CREATE INDEX "LookupOption_createdById_idx" ON "LookupOption"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "LookupOption_type_label_key" ON "LookupOption"("type", "label");

-- AddForeignKey
ALTER TABLE "LookupOption" ADD CONSTRAINT "LookupOption_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
