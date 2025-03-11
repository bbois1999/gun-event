/*
  Warnings:

  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - Made the column `phoneNumber` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `username` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "verifiedEmail" BOOLEAN NOT NULL DEFAULT false,
    "verifiedPhone" BOOLEAN NOT NULL DEFAULT false,
    "preferredMfa" TEXT NOT NULL DEFAULT 'email',
    "otpSecret" TEXT,
    "otpExpiry" DATETIME
);
INSERT INTO "new_User" ("email", "id", "otpExpiry", "otpSecret", "phoneNumber", "preferredMfa", "username", "verifiedEmail", "verifiedPhone") SELECT "email", "id", "otpExpiry", "otpSecret", "phoneNumber", coalesce("preferredMfa", 'email') AS "preferredMfa", "username", "verifiedEmail", "verifiedPhone" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
