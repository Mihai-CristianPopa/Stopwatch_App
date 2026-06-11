import client from "../db/mongoClient.js";

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

export function deleteUser(emailAddress) {
  const db = client.db("stopwatch_auth");
  const collection = db.collection("users");
  return collection.deleteOne({ email_address: emailAddress });
}
