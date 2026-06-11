import { ObjectId } from "mongodb";
import dbClient from "../db/mongoClient.js";
import logger from "../logger.js";

function collection() {
  return dbClient.db("time_tracker").collection("intervals");
}

export function createIntervals(rows) {
  return collection().insertMany(rows);
}

export async function totalsByDay(userId, { from, to }) {
  const result = await collection().aggregate([
    {
      $match: {
        user_id: userId instanceof ObjectId ? userId : new ObjectId(userId),
        date: { $gte: from, $lte: to }
      }
    },
    {
      $group: {
        _id: "$date",
        total_ms: { $sum: "$duration_ms" }
      }
    },
    { $sort: { _id: 1 } }
  ]).toArray();

  return result.map(r => ({ date: r._id, total_ms: r.total_ms }));
}

export async function ensureIndexes() {
  const col = collection();
  await col.createIndex({ user_id: 1, date: 1 }, { background: true });
  await col.createIndex({ user_id: 1, start_time: -1 }, { background: true });
  logger.info("Interval indexes ensured.");
}
