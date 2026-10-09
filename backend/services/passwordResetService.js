import { ObjectId } from "mongodb";
import client from "../db/mongoClient.js";

function collection() {
  return client.db("stopwatch_auth").collection("password_reset_table");
}

export function createPasswordResetEntry(passwordResetObject) {
  return collection().insertOne(passwordResetObject);
}

function updatePasswordResetEntry(id, updateFields) {
  return collection().updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
}

export function invalidatePasswordResetEntry(id) {
  return updatePasswordResetEntry(id, {
    valid: false
  });
}

export function invalidatePasswordResetEntryByEmail(email) {
  return updatePasswordResetEntry({email: email}, {
    valid: false
  });
}

export function successfulPasswordResetEntry(id) {
  return updatePasswordResetEntry(id, {
    valid: false,
    succeeded: true
  });
}

export function getPasswordResetEntryByToken(token) {
  return collection().findOne({ 
    tokenHash: token,
    valid: true
  });
}

export function getPasswordResetEntryById(id) {
  return collection().findOne({ 
    _id: new ObjectId(id),
    valid: true
  });
}

export function getNotExpiredPasswordResetEntryByEmail(email) {
  return collection().findOne({ 
    email: email,
    exp: { $gt : new Date() },
    valid: true
  });
}