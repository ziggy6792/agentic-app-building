import { PostgresStore } from '@mastra/pg';

let database: PostgresStore | null = null;

export const getStorage = (): PostgresStore => {
  if (database) {
    return database;
  }

  database = new PostgresStore({
    connectionString: process.env.DB_CONNECTION_STRING!,
  });

  return database;
};
