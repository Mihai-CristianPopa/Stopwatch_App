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

export function getUserLoginSession(userId) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("sessions");
  return collection.findOne({ user_id: new ObjectId(userId) });
}

/**
 * Deprecated
 * @param {*} sessionId 
 * @param {*} startTime 
 * @returns 
 */
export function updateSessionStopwatchStartTime(sessionId, startTime) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("sessions");
  const update = startTime
    ? { $set: { stopwatch_start_time: startTime } }
    : { $unset: { stopwatch_start_time: "" } };
  return collection.updateOne({ _id: new ObjectId(sessionId) }, update);
}

export function startSessionStopwatch(sessionId, startTime) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("sessions");
  return collection.updateOne(
    { _id: new ObjectId(sessionId), stopwatch_start_time: { $exists: false } },
    { $set: { stopwatch_start_time: startTime } }
  );
}

export function stopSessionStopwatch(sessionId) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("sessions");
  return collection.updateOne(
    { _id: new ObjectId(sessionId) },
    { $unset: { stopwatch_start_time: "" } }
  );
}

export function updateLoginSession(sessionId, lastLoginTime) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("sessions");
  return collection.updateOne(
    { _id: new ObjectId(sessionId) },
    { $set: { last_login_time: lastLoginTime } }
  );
}

export async function ensureSessionIndexes() {
  const db = client.db("stopwatch_auth");
  await db.collection("sessions").createIndex({ user_id: 1 }, { unique: true });
}

// Device sessions
export function createDeviceSession(deviceSession) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("device_sessions");
  return collection.insertOne(deviceSession);
}

export function getDeviceSession(deviceSessionId) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("device_sessions");
  return collection.findOne({ _id: new ObjectId(deviceSessionId) });
}

export function deleteDeviceSession(deviceSessionId) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("device_sessions");
  return collection.deleteOne({ _id: new ObjectId(deviceSessionId) });
}
