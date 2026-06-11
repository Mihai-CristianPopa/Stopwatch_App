import dbClient from "../db/mongoClient.js";
import logger from "../logger.js";

export async function createClearingIndex(databaseName, collectionName, timestampColumn, numberOfSecondsBeforeExpiry) {
    const db = dbClient.db(databaseName);
    const collection = db.collection(collectionName);

    const indexName = `${timestampColumn}_1`;

    try {
        const indexExists = await collection.indexExists(indexName);

        if (indexExists) {
            const indexes = await collection.indexes();
            const currentIndex = indexes.find(index => index.name === indexName);

            if (currentIndex && currentIndex.expireAfterSeconds !== numberOfSecondsBeforeExpiry) {
                logger.info(`Updating TTL index ${indexName} from ${currentIndex.expireAfterSeconds}s to ${numberOfSecondsBeforeExpiry}s`)
                await collection.dropIndex(indexName);
                return collection.createIndex(
                    { [timestampColumn]: 1 },
                    {
                        expireAfterSeconds: numberOfSecondsBeforeExpiry,
                        name: indexName
                    }
                );
            } else {
                logger.info(`TTL index ${indexName} already exists with correct expiration time.`);
                return;
            }
        } else {
            logger.info(`Creating new TTL index ${indexName} with ${numberOfSecondsBeforeExpiry}s expiration.`);
            return collection.createIndex(
                { [timestampColumn]: 1 },
                {
                    expireAfterSeconds: numberOfSecondsBeforeExpiry,
                    name: indexName
                }
            );
        }
    } catch (error) {
        logger.error(`Failed to create/update TTL index ${indexName}:`, error);
        throw error;
    }
}
