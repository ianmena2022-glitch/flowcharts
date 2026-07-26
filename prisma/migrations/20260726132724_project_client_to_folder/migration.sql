-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- Backfill Folder from existing Project rows (preserve current organization)
INSERT INTO "Folder" ("id", "name", "createdAt")
SELECT "id", "name", "createdAt" FROM "Project";

-- AlterTable: add folderId to Subprocess, backfill from projectId
ALTER TABLE "Subprocess" ADD COLUMN "folderId" TEXT;
UPDATE "Subprocess" SET "folderId" = "projectId";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_clientId_fkey";
ALTER TABLE "Subprocess" DROP CONSTRAINT IF EXISTS "Subprocess_projectId_fkey";

-- Drop obsolete column/tables
ALTER TABLE "Subprocess" DROP COLUMN "projectId";
DROP TABLE "Project";
DROP TABLE "Client";

-- AddForeignKey
ALTER TABLE "Subprocess" ADD CONSTRAINT "Subprocess_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
