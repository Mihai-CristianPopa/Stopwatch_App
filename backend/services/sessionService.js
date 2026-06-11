import client from "../db/mongoClient.js";
import { ObjectId } from "mongodb";

export function createLoginSession(session) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("sessions");
  return collection.insertOne(session);
}

export function deleteLoginSession(sessionId) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("sessions");
  return collection.deleteOne({ _id: new ObjectId(sessionId) });
}

export function getLoginSession(sessionId) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("sessions");
  return collection.findOne({ _id: new ObjectId(sessionId) });
}
