import client from "../db/mongoClient.js";
import { ObjectId } from "mongodb";

export function registerUser(user) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("users");
  return collection.insertOne(user);
};

export function getUserByEmail(emailAddress) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("users");
  return collection.findOne({ email_address: emailAddress });
}

export function getUserById(userId) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("users");
  return collection.findOne({ _id: new ObjectId(userId) });
}

export function activateUser(userId) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("users");
  return collection.updateOne({ _id: new ObjectId(userId) }, { $set: { isVerified: true,  emailVerificationToken: undefined, emailVerificationExpiresAt: undefined } });
}

export function deleteUser(emailAddress) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("users");
  return collection.deleteOne({ email_address: emailAddress });
}
