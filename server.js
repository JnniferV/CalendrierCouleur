import express from 'express'
import path from 'node:path'
import { supabase } from './db.js'

const DAY = /^\d{4}-\d{2}-\d{2}$/
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '4kb' })) // n'accepte que application/json : bloque les formulaires envoyés depuis un autre site
app.use(express.static(path.join(import.meta.dirname, 'public')))

app.get('/api/month/:month', async (req, res) => {
  const { month } = req.params
  if (!MONTH.test(month)) return res.sendStatus(400)
  const [year, monthNumber] = month.split('-').map(Number)
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10)
  const inMonth = (table, columns) =>
    supabase.from(table).select(columns).gte('day', `${month}-01`).lt('day', nextMonth)

  const [people, allocations, comments] = await Promise.all([
    supabase.from('people').select('id, name, color').order('id').throwOnError(),
    inMonth('allocations', 'day, person_id').throwOnError(),
    inMonth('comments', 'id, day, person_id, message, created_at').order('day').order('id').throwOnError(),
  ])
  res.json({
    people: people.data,
    allocations: Object.fromEntries(allocations.data.map((r) => [r.day, r.person_id])),
    comments: comments.data,
  })
})

app.put('/api/allocations/:day', async (req, res) => {
  const { day } = req.params
  const personId = req.body?.personId
  if (!DAY.test(day) || !Number.isInteger(personId)) return res.sendStatus(400)
  await supabase.from('allocations').upsert({ day, person_id: personId }).throwOnError()
  res.sendStatus(204)
})

app.delete('/api/allocations/:day', async (req, res) => {
  const { day } = req.params
  if (!DAY.test(day)) return res.sendStatus(400)
  await supabase.from('allocations').delete().eq('day', day).throwOnError()
  res.sendStatus(204)
})

app.post('/api/comments', async (req, res) => {
  const { day, personId, message } = req.body ?? {}
  const text = typeof message === 'string' ? message.trim() : ''
  if (!DAY.test(day) || !Number.isInteger(personId) || !text || text.length > 1000) return res.sendStatus(400)
  await supabase.from('comments').insert({ day, person_id: personId, message: text }).throwOnError()
  res.sendStatus(201)
})

app.delete('/api/comments/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) return res.sendStatus(400)
  await supabase.from('comments').delete().eq('id', id).throwOnError()
  res.sendStatus(204)
})

// Ne renvoie jamais le détail d'une erreur au navigateur
app.use((err, req, res, next) => {
  console.error(err)
  res.sendStatus(err.status ?? 500)
})

app.listen(process.env.PORT || 3000)
