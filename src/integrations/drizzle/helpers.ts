import type { SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";

export function lower<T extends AnyPgColumn>(email: T): SQL<T> {
  return sql`lower(${email})`;
}
