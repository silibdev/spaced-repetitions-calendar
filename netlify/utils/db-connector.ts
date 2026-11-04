import { neon } from '@neondatabase/serverless';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL must be configured for Neon');
}

const sql = neon(connectionString);

type QueryResult<T> = { data: T[] | T | null; count: number | null };
type Filter = { column: string; operator: '=' | 'IN'; value: any };

function identifier(value: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }
  return `"${value}"`;
}

function tableName(value: string): string {
  return `"db".${identifier(value)}`;
}

const conflictColumns: Record<string, string[]> = {
  settings: ['user'],
  eventlist: ['user'],
  eventdetail: ['user', 'id'],
  eventdescription: ['user', 'id'],
  photo: ['user', 'id'],
  qnastatus: ['user', 'eventid', 'id'],
  qnatemplate: ['user', 'eventid', 'id'],
  calendarevent: ['user', 'id', 'start'],
};

/** A small compatibility layer for the former Supabase query chains. */
class NeonQuery {
  private operation: 'select' | 'delete' | 'upsert' = 'select';
  private projection = '*';
  private filters: Filter[] = [];
  private orderBy?: { column: string; ascending: boolean };
  private values: Record<string, any>[] = [];
  private ignoreDuplicates = false;
  private returning = false;

  constructor(private readonly table: string) {}

  select(columns = '*'): this {
    this.projection = columns
      .split(',')
      .map((column) => column.trim())
      .filter((column) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column))
      .map(identifier)
      .join(', ') || '*';
    if (this.operation !== 'select') this.returning = true;
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push({ column, operator: '=', value });
    return this;
  }

  in(column: string, values: any[]): this {
    this.filters.push({ column, operator: 'IN', value: values });
    return this;
  }

  order(column: string, { ascending = true } = {}): this {
    this.orderBy = { column, ascending };
    return this;
  }

  or(expression: string): this {
    const alternatives = expression.split(',').map((part) => {
      const match = /^([a-zA-Z_][a-zA-Z0-9_]*)\.eq\.(.+)$/.exec(part);
      if (!match) throw new Error('Unsupported OR filter');
      return { column: match[1], value: match[2] };
    });
    // The calendar-event API only uses this two-way equality filter.
    (this as any).orFilters = alternatives;
    return this;
  }

  delete(): this {
    this.operation = 'delete';
    return this;
  }

  upsert(values: Record<string, any> | Record<string, any>[], options?: { ignoreDuplicates?: boolean }): this {
    this.operation = 'upsert';
    this.values = Array.isArray(values) ? values : [values];
    this.ignoreDuplicates = options?.ignoreDuplicates ?? false;
    return this;
  }

  maybeSingle(): Promise<QueryResult<any>> {
    return this.execute().then((result) => ({
      ...result,
      data: Array.isArray(result.data) ? result.data[0] ?? null : result.data,
    }));
  }

  single(): Promise<QueryResult<any>> {
    return this.execute().then((result) => {
      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      if (!row) throw new Error(`Expected one row from ${this.table}`);
      return { ...result, data: row };
    });
  }

  then<TResult1 = QueryResult<any>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult<any>> {
    const params: any[] = [];
    const addParam = (value: any) => {
      params.push(value);
      return `$${params.length}`;
    };
    const conditions = this.filters.map(({ column, operator, value }) => {
      const field = identifier(column);
      if (operator === 'IN') {
        if (!value.length) return 'FALSE';
        return `${field} = ANY(${addParam(value)})`;
      }
      if (value === null) return `${field} IS NULL`;
      return `${field} = ${addParam(value)}`;
    });
    const orFilters = (this as any).orFilters as { column: string; value: any }[] | undefined;
    if (orFilters?.length) {
      conditions.push(`(${orFilters.map(({ column, value }) => `${identifier(column)} = ${addParam(value)}`).join(' OR ')})`);
    }
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    let rows: any[] = [];

    if (this.operation === 'select') {
      let statement = `SELECT ${this.projection} FROM ${tableName(this.table)}${where}`;
      if (this.orderBy) statement += ` ORDER BY ${identifier(this.orderBy.column)} ${this.orderBy.ascending ? 'ASC' : 'DESC'}`;
      rows = await sql.query(statement, params);
    } else if (this.operation === 'delete') {
      const statement = `DELETE FROM ${tableName(this.table)}${where}${this.returning ? ` RETURNING ${this.projection}` : ''}`;
      rows = await sql.query(statement, params);
    } else if (this.values.length) {
      const columns = [...new Set(this.values.flatMap((row) => Object.keys(row)))];
      const tuples = this.values.map((row) => `(${columns.map((column) => addParam(row[column] ?? null)).join(', ')})`);
      const keys = conflictColumns[this.table];
      if (!keys) throw new Error(`No conflict key configured for ${this.table}`);
      const conflict = ` ON CONFLICT (${keys.map(identifier).join(', ')}) `;
      const updates = columns.filter((column) => !keys.includes(column));
      const onConflict = this.ignoreDuplicates || !updates.length
        ? `${conflict}DO NOTHING`
        : `${conflict}DO UPDATE SET ${updates.map((column) => `${identifier(column)} = EXCLUDED.${identifier(column)}`).join(', ')}`;
      const statement = `INSERT INTO ${tableName(this.table)} (${columns.map(identifier).join(', ')}) VALUES ${tuples.join(', ')}${onConflict}${this.returning ? ` RETURNING ${this.projection}` : ''}`;
      rows = await sql.query(statement, params);
    }

    return { data: rows, count: rows.length };
  }
}

export const DB = {
  from(table: string): NeonQuery {
    return new NeonQuery(table);
  },
};
