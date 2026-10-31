ALTER TABLE "Room" ALTER COLUMN "movieId" DROP NOT NULL;

UPDATE "Room"
SET "movieId" = NULL
WHERE "movieId" IN (
    SELECT "id"
    FROM "Movie"
    WHERE "source" = 'p2p'
);

DELETE FROM "Movie"
WHERE "source" = 'p2p';
