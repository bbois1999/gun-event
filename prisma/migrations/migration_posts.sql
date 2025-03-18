-- Migration script to update posts schema
-- Note: This is a sample migration script. For actual migrations, 
-- use Prisma's migration system with `npx prisma migrate dev`

-- Step 1: Add new fields to Post table
ALTER TABLE Post ADD COLUMN imageUrl TEXT;
ALTER TABLE Post ADD COLUMN imageKey TEXT;

-- Step 2: Migrate data from ImagePost to Post
INSERT INTO Post (id, createdAt, updatedAt, title, content, published, imageUrl, authorId, eventId)
SELECT id, createdAt, updatedAt, title, content, published, image, authorId, eventId
FROM ImagePost;

-- Step 3: Migrate likes from ImagePost to Post
UPDATE Like
SET postId = imagePostId
WHERE imagePostId IS NOT NULL AND postId IS NULL;

-- Step 4: Update notifications
UPDATE Notification
SET postId = imagePostId
WHERE imagePostId IS NOT NULL AND postId IS NULL;

-- Step 5: Drop imagePostId column from Like table
-- Note: SQLite doesn't support DROP COLUMN, so we need a workaround
-- For SQLite, you'd typically recreate the table
-- In production with Postgres/MySQL, you'd use:
-- ALTER TABLE Like DROP COLUMN imagePostId; 