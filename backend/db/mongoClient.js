import { MongoClient, ServerApiVersion } from 'mongodb';
import { config } from "../configs/config.js";

const client = new MongoClient(config.mongoUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

export default client;
