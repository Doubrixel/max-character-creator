import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const client = createClient({ url: process.env.DATABASE_URL || 'file:///app/data/sqlite.db' });

export const db = drizzle(client, { schema });
