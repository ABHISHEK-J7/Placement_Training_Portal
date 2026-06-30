import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
// Optional override; if unset, the database from the connection string is used.
const dbName = process.env.MONGODB_DB;

// Cache the client across hot-reloads / requests to avoid exhausting connections.
let cached = global._toriiMongo;
if (!cached) {
  cached = global._toriiMongo = { client: null, promise: null };
}

/** Returns a connected Db instance (singleton). */
export async function getDb() {
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local / server env.");
  }
  if (!cached.promise) {
    cached.promise = MongoClient.connect(uri).then((client) => {
      cached.client = client;
      return client;
    });
  }
  const client = await cached.promise;
  return dbName ? client.db(dbName) : client.db();
}

/** Convenience accessor for a named collection. */
export async function collection(name) {
  const db = await getDb();
  return db.collection(name);
}
