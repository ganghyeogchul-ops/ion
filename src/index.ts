import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

// Ensure D1 schema exists (Pages deployments do not automatically apply migrations)
let _schemaReady: Promise<void> | null = null;

async function ensureSchema(db: D1Database): Promise<void> {
  if (_schemaReady) return _schemaReady;
  _schemaReady = (async () => {
    const statements: string[] = [
      `CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        board_type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        item_name TEXT,
        price TEXT,
        views INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT,
        created_at INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        is_admin INTEGER DEFAULT 0,
        deleted_at INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS trade_requests (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        post_title TEXT NOT NULL,
        name TEXT NOT NULL,
        id_number TEXT NOT NULL,
        phone TEXT NOT NULL,
        game_id TEXT NOT NULL,
        sell_amount INTEGER DEFAULT 0,
        buy_amount INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        custom_date TEXT,
        created_at INTEGER NOT NULL,
        deleted_at INTEGER
      )`,
      `CREATE INDEX IF NOT EXISTS idx_posts_board_type ON posts(board_type)`,
      `CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_trade_requests_status ON trade_requests(status)`,
      `CREATE INDEX IF NOT EXISTS idx_trade_requests_created_at ON trade_requests(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_trade_requests_custom_date ON trade_requests(custom_date)`,
      `CREATE INDEX IF NOT EXISTS idx_members_username ON members(username)`,
      `CREATE INDEX IF NOT EXISTS idx_members_status ON members(status)`
    ];

    for (const sql of statements) {
      await db.prepare(sql).run();
    }
  })();
  return _schemaReady;
}



const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())
app.use('/tables/*', cors())

// Helper function to generate UUID
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Helper function to get current timestamp
function now(): number {
  return Date.now()
}

// RESTful Table API - Get all records with pagination
app.get('/tables/:table', async (c) => {
  await ensureSchema(env.DB);
  const { env } = c
  const table = c.req.param('table')
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const search = c.req.query('search') || ''
  const offset = (page - 1) * limit

  try {
    let query = `SELECT * FROM ${table} WHERE deleted_at IS NULL`
    let countQuery = `SELECT COUNT(*) as total FROM ${table} WHERE deleted_at IS NULL`
    
    if (search) {
      query += ` AND (title LIKE '%${search}%' OR content LIKE '%${search}%' OR author LIKE '%${search}%')`
      countQuery += ` AND (title LIKE '%${search}%' OR content LIKE '%${search}%' OR author LIKE '%${search}%')`
    }
    
    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`

    const { results } = await env.DB.prepare(query).all()
    const { results: countResults } = await env.DB.prepare(countQuery).all()
    const total = (countResults[0] as any).total

    return c.json({
      data: results,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// RESTful Table API - Get single record
app.get('/tables/:table/:id', async (c) => {
  await ensureSchema(env.DB);
  const { env } = c
  const table = c.req.param('table')
  const id = c.req.param('id')

  try {
    const { results } = await env.DB.prepare(
      `SELECT * FROM ${table} WHERE id = ? AND deleted_at IS NULL`
    ).bind(id).all()

    if (!results || results.length === 0) {
      return c.json({ error: 'Not found' }, 404)
    }

    return c.json(results[0])
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// RESTful Table API - Create record
app.post('/tables/:table', async (c) => {
  await ensureSchema(env.DB);
  const { env } = c
  const table = c.req.param('table')
  const body = await c.req.json()

  try {
    const id = body.id || generateId()
    const timestamp = now()
    
    const data = {
      ...body,
      id,
      created_at: body.created_at || timestamp,
      updated_at: timestamp
    }

    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map(() => '?').join(', ')

    await env.DB.prepare(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
    ).bind(...values).run()

    return c.json({ id, ...data }, 201)
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// RESTful Table API - Update record
app.put('/tables/:table/:id', async (c) => {
  const { env } = c
  const table = c.req.param('table')
  const id = c.req.param('id')
  const body = await c.req.json()

  try {
    const data = {
      ...body,
      updated_at: now()
    }

    delete data.id
    delete data.created_at

    const updates = Object.keys(data).map(key => `${key} = ?`).join(', ')
    const values = Object.values(data)

    await env.DB.prepare(
      `UPDATE ${table} SET ${updates} WHERE id = ?`
    ).bind(...values, id).run()

    const { results } = await env.DB.prepare(
      `SELECT * FROM ${table} WHERE id = ?`
    ).bind(id).all()

    return c.json(results[0])
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// RESTful Table API - Patch (partial update)
app.patch('/tables/:table/:id', async (c) => {
  await ensureSchema(env.DB);
  const { env } = c
  const table = c.req.param('table')
  const id = c.req.param('id')
  const body = await c.req.json()

  try {
    const data = {
      ...body,
      updated_at: now()
    }

    delete data.id
    delete data.created_at

    const updates = Object.keys(data).map(key => `${key} = ?`).join(', ')
    const values = Object.values(data)

    await env.DB.prepare(
      `UPDATE ${table} SET ${updates} WHERE id = ?`
    ).bind(...values, id).run()

    const { results } = await env.DB.prepare(
      `SELECT * FROM ${table} WHERE id = ?`
    ).bind(id).all()

    return c.json(results[0])
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// RESTful Table API - Delete (soft delete)
app.delete('/tables/:table/:id', async (c) => {
  await ensureSchema(env.DB);
  const { env } = c
  const table = c.req.param('table')
  const id = c.req.param('id')

  try {
    await env.DB.prepare(
      `UPDATE ${table} SET deleted_at = ? WHERE id = ?`
    ).bind(now(), id).run()

    return c.json({ success: true, message: 'Deleted successfully' })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: now() })
})

// Serve static files - MUST be LAST to avoid catching API routes
app.use('/static/*', serveStatic({ root: './public' }))
app.use('/*', serveStatic({ root: './public' }))

export default app
