-- AlterEnum
BEGIN;
CREATE TYPE "LookupType_new" AS ENUM ('JO_STATUS', 'JO_CATEGORY');
ALTER TABLE "LookupOption" ALTER COLUMN "type" TYPE "LookupType_new" USING ("type"::text::"LookupType_new");
ALTER TYPE "LookupType" RENAME TO "LookupType_old";
ALTER TYPE "LookupType_new" RENAME TO "LookupType";
DROP TYPE "public"."LookupType_old";
COMMIT;

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "team" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");

-- CreateIndex
CREATE INDEX "Employee_isActive_idx" ON "Employee"("isActive");

-- CreateIndex
CREATE INDEX "Employee_team_idx" ON "Employee"("team");

-- CreateIndex
CREATE INDEX "Employee_createdById_idx" ON "Employee"("createdById");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

