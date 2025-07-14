-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT DEFAULT 'https://api.dicebear.com/7.x/identicon/svg?seed=default';

-- AlterTable
ALTER TABLE "_BadgeToUser" ADD CONSTRAINT "_BadgeToUser_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_BadgeToUser_AB_unique";
