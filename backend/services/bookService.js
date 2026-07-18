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
    .sort({ sort_order: 1, date_added: -1, created_at: -1 })
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

export async function getMinSortOrder(userId, status) {
  const uid = coerceId(userId);
  const doc = await collection().findOne(
    { user_id: uid, status },
    { sort: { sort_order: 1 }, projection: { sort_order: 1 } }
  );
  return doc?.sort_order ?? 0;
}

export async function bulkReorder(userId, status, orderedIds) {
  const uid = coerceId(userId);
  const now = new Date().toISOString();
  const ops = orderedIds.map((id, i) => ({
    updateOne: {
      filter: { _id: new ObjectId(id), user_id: uid, status },
      update: { $set: { sort_order: i, updated_at: now } },
    },
  }));
  if (ops.length === 0) return { modifiedCount: 0 };
  return collection().bulkWrite(ops);
}

export async function getBookById(userId, bookId) {
  const uid = coerceId(userId);
  return collection().findOne({ _id: new ObjectId(bookId), user_id: uid });
}

export async function ensureIndexes() {
  const col = collection();
  await col.createIndex({ user_id: 1, status: 1, date_added: -1 }, { background: true });
  await col.createIndex({ user_id: 1, status: 1, sort_order: 1 }, { background: true });
  logger.info("Book indexes ensured.");
}
