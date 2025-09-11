/*
  Warnings:

  - The values [other] on the enum `TaskCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."TaskCategory_new" AS ENUM ('web_development', 'mobile_development', 'design', 'writing', 'marketing', 'data_analysis', 'otherc');
ALTER TABLE "public"."Task" ALTER COLUMN "category" TYPE "public"."TaskCategory_new" USING ("category"::text::"public"."TaskCategory_new");
ALTER TYPE "public"."TaskCategory" RENAME TO "TaskCategory_old";
ALTER TYPE "public"."TaskCategory_new" RENAME TO "TaskCategory";
DROP TYPE "public"."TaskCategory_old";
COMMIT;
