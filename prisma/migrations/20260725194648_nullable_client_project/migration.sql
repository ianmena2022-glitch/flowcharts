-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "clientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Subprocess" ALTER COLUMN "projectId" DROP NOT NULL;
