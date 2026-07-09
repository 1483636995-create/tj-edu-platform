-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('GROUP', 'ONE_ON_ONE');

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "title" VARCHAR(160) NOT NULL DEFAULT '未命名课节',
ADD COLUMN     "type" "LessonType" NOT NULL DEFAULT 'GROUP';

ALTER TABLE "Lesson" ALTER COLUMN "title" DROP DEFAULT;
