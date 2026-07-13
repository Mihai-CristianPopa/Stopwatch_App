import { ObjectId } from "mongodb";
import dbClient from "../db/mongoClient.js";
import logger from "../logger.js";

function collection() {
  return dbClient.db("time_tracker").collection("books");
}

function coerceId(id) {
  return id instanceof ObjectId ? id : new ObjectId(id);
}

export function createBook(doc) {
  return collection().insertOne(doc);
}

export async function listBooks(userId, status) {
  const uid = coerceId(userId);
  return collection()
    .find({ user_id: uid, status })
    .sort({ date_added: -1, created_at: -1 })
    .toArray();
}

export async function updateBook(userId, bookId, fields) {
  const uid = coerceId(userId);
  return collection().findOneAndUpdate(
    { _id: new ObjectId(bookId), user_id: uid },
    { $set: fields },
    { returnDocument: "after" }
  );
}

export async function ensureIndexes() {
  const col = collection();
  await col.createIndex({ user_id: 1, status: 1, date_added: -1 }, { background: true });
  logger.info("Book indexes ensured.");
}
