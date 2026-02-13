import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database;
  ASSETS: any;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 활성화
app.use('/tables/*', cors())

// RESTful Table API - 목록 조회
app.get('/tables/:table', async (c) => {
  const { env } = c
  const table = c.req.param('table')
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const search = c.req.query('search') || ''
  const offset = (page - 1) * limit

  try {
    let query = `SELECT * FROM ${table}`
    let countQuery = `SELECT COUNT(*) as count FROM ${table}`
    const params: any[] = []
    
    if (search) {
      query += ` WHERE title LIKE ? OR content LIKE ? OR author LIKE ?`
      countQuery += ` WHERE title LIKE ? OR content LIKE ? OR author LIKE ?`
      const searchParam = `%${search}%`
      params.push(searchParam, searchParam, searchParam)
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)
    
    const { results: data } = await env.DB.prepare(query).bind(...params).all()
    const { results: countResult } = await env.DB.prepare(countQuery).bind(...(search ? [search, search, search] : [])).all()
    const total = countResult[0]?.count || 0
    
    return c.json({
      data,
      total,
      page,
      limit
    })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// RESTful Table API - 단일 레코드 조회
app.get('/tables/:table/:id', async (c) => {
  const { env } = c
  const table = c.req.param('table')
  const id = c.req.param('id')

  try {
    const { results } = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).all()
    
    if (results.length === 0) {
      return c.json({ error: 'Not found' }, 404)
    }
    
    return c.json(results[0])
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// RESTful Table API - 레코드 생성
app.post('/tables/:table', async (c) => {
  const { env } = c
  const table = c.req.param('table')
  const data = await c.req.json()

  try {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const now = Date.now()
    
    const fields = { id, ...data, created_at: now, updated_at: now }
    const columns = Object.keys(fields).join(', ')
    const placeholders = Object.keys(fields).map(() => '?').join(', ')
    const values = Object.values(fields)
    
    await env.DB.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`).bind(...values).run()
    
    return c.json({ id, ...data, created_at: now, updated_at: now })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// RESTful Table API - 레코드 수정
app.patch('/tables/:table/:id', async (c) => {
  const { env } = c
  const table = c.req.param('table')
  const id = c.req.param('id')
  const data = await c.req.json()

  try {
    const now = Date.now()
    const fields = { ...data, updated_at: now }
    const setClause = Object.keys(fields).map(key => `${key} = ?`).join(', ')
    const values = [...Object.values(fields), id]
    
    await env.DB.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).bind(...values).run()
    
    return c.json({ id, ...data, updated_at: now })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// PUT도 지원 (전체 업데이트)
app.put('/tables/:table/:id', async (c) => {
  const { env } = c
  const table = c.req.param('table')
  const id = c.req.param('id')
  const data = await c.req.json()

  try {
    const now = Date.now()
    const fields = { ...data, updated_at: now }
    const setClause = Object.keys(fields).map(key => `${key} = ?`).join(', ')
    const values = [...Object.values(fields), id]
    
    await env.DB.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).bind(...values).run()
    
    return c.json({ id, ...data, updated_at: now })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// RESTful Table API - 레코드 삭제
app.delete('/tables/:table/:id', async (c) => {
  const { env } = c
  const table = c.req.param('table')
  const id = c.req.param('id')

  try {
    await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run()
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 정적 파일 폴백 (Cloudflare Pages의 ASSETS 사용)
app.get('*', async (c) => {
  // API 라우트가 아니면 ASSETS(정적 파일)로 폴백
  const { env } = c
  if (env.ASSETS) {
    return env.ASSETS.fetch(c.req.raw)
  }
  return c.notFound()
})

export default app
