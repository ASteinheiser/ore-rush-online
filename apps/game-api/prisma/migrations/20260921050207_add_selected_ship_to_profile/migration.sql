/*
  Warnings:

  - A unique constraint covering the columns `[selectedShipId]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "selectedShipId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Profile_selectedShipId_key" ON "Profile"("selectedShipId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_selectedShipId_fkey" FOREIGN KEY ("selectedShipId") REFERENCES "Ship"("id") ON DELETE SET NULL ON UPDATE CASCADE;
