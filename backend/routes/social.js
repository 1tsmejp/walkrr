module.exports = function(app, db, authRequired) {
  // ------- Groups -------
  app.get('/groups', authRequired, async (req,res) => {
    const { rows } = await db.query(`
      SELECT g.*,
        (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS members_count
      FROM groups g
      WHERE g.privacy IN ('public','approval')
      ORDER BY g.created_at DESC NULLS LAST, g.id DESC
    `)
    res.json(rows)
  })

  app.get('/groups/mine', authRequired, async (req,res) => {
    const { rows } = await db.query(`
      SELECT g.* FROM groups g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE gm.user_id = $1::uuid
      ORDER BY g.created_at DESC NULLS LAST, g.id DESC
    `, [req.user.id])
    res.json(rows)
  })

  app.get('/groups/requests/mine', authRequired, async (req,res) => {
    const { rows } = await db.query(`
      SELECT gr.*, g.name FROM group_join_requests gr
      JOIN groups g ON g.id = gr.group_id
      WHERE gr.user_id = $1::uuid AND gr.status = 'pending'
    `, [req.user.id])
    res.json(rows)
  })

  app.post('/groups', authRequired, async (req,res) => {
    const { name, description, privacy } = req.body
    if (!name) return res.status(400).send('name required')
    const priv = ['public','approval','private'].includes(privacy) ? privacy : 'public'
    const { rows } = await db.query(
      `INSERT INTO groups (name, description, privacy, created_by, created_at)
       VALUES ($1,$2,$3,$4::uuid, now()) RETURNING *`,
      [name, (description || ''), priv, req.user.id]
    )
    const g = rows[0]
    await db.query(
      `INSERT INTO group_members (user_id, group_id) VALUES ($1::uuid,$2::uuid) ON CONFLICT DO NOTHING`,
      [req.user.id, g.id]
    )
    res.json(g)
  })

  app.post('/groups/:id/join', authRequired, async (req,res) => {
    const gid = req.params.id
    const g = (await db.query(`SELECT * FROM groups WHERE id=$1::uuid`, [gid])).rows[0]
    if (!g) return res.status(404).send('group not found')

    if (g.privacy === 'public') {
      await db.query(
        `INSERT INTO group_members (user_id, group_id) VALUES ($1::uuid,$2::uuid) ON CONFLICT DO NOTHING`,
        [req.user.id, gid]
      )
      return res.json({ ok:true, status:'joined' })
    }
    if (g.privacy === 'approval') {
      await db.query(
        `INSERT INTO group_join_requests (user_id, group_id, status)
         VALUES ($1::uuid,$2::uuid,'pending') ON CONFLICT DO NOTHING`,
        [req.user.id, gid]
      )
      return res.json({ ok:true, status:'requested' })
    }
    return res.status(403).send('private group (invite only)')
  })

  app.post('/groups/:id/leave', authRequired, async (req,res) => {
    const gid = req.params.id
    await db.query(
      `DELETE FROM group_members WHERE user_id=$1::uuid AND group_id=$2::uuid`,
      [req.user.id, gid]
    )
    res.json({ ok:true })
  })

  // Optional: owner approves
  app.post('/groups/:id/requests/:userId/approve', authRequired, async (req,res) => {
    const gid = req.params.id, uid = req.params.userId
    const g = (await db.query(`SELECT * FROM groups WHERE id=$1::uuid`, [gid])).rows[0]
    if (!g) return res.status(404).send('group not found')
    if (String(g.created_by) !== String(req.user.id)) return res.status(403).send('only owner can approve')

    await db.query(
      `UPDATE group_join_requests SET status='approved'
       WHERE user_id=$1::uuid AND group_id=$2::uuid`,
      [uid, gid]
    )
    await db.query(
      `INSERT INTO group_members (user_id, group_id)
       VALUES ($1::uuid,$2::uuid) ON CONFLICT DO NOTHING`,
      [uid, gid]
    )
    res.json({ ok:true })
  })

  // ------- Social follow -------
  app.get('/users/search', authRequired, async (req,res) => {
    const q = (req.query.q || '').trim()
    const rows = (await db.query(`
      SELECT id, display_name, email, photo_url
      FROM users
      WHERE ($1 = '' OR display_name ILIKE '%'||$1||'%' OR email ILIKE '%'||$1||'%')
        AND id <> $2::uuid
      ORDER BY display_name NULLS LAST, email ASC
      LIMIT 25
    `, [q, req.user.id])).rows
    res.json(rows)
  })

  app.get('/users/me/relations', authRequired, async (req,res) => {
    const followingIds = (await db.query(
      `SELECT followee_id FROM user_follows WHERE follower_id=$1::uuid`, [req.user.id]
    )).rows.map(r=>r.followee_id)
    const followerIds = (await db.query(
      `SELECT follower_id FROM user_follows WHERE followee_id=$1::uuid`, [req.user.id]
    )).rows.map(r=>r.follower_id)
    const mutualIds = followingIds.filter(id => followerIds.includes(id))
    res.json({ followingIds, followerIds, mutualIds })
  })

  app.post('/users/:id/follow', authRequired, async (req,res) => {
    const uid = req.params.id
    if (String(uid) === String(req.user.id)) return res.status(400).send('cannot follow yourself')
    await db.query(
      `INSERT INTO user_follows (follower_id, followee_id)
       VALUES ($1::uuid,$2::uuid) ON CONFLICT DO NOTHING`,
      [req.user.id, uid]
    )
    res.json({ ok:true })
  })

  app.post('/users/:id/unfollow', authRequired, async (req,res) => {
    const uid = req.params.id
    await db.query(
      `DELETE FROM user_follows WHERE follower_id=$1::uuid AND followee_id=$2::uuid`,
      [req.user.id, uid]
    )
    res.json({ ok:true })
  })

  // ------- Walks: visibility + notes + shares + feed filter -------
  app.post('/walks', authRequired, async (req,res) => {
    const { pet_ids = [], route = [], distance_m = 0, duration_s = 0, events = [], notes = '', group_ids = [], visibility='private' } = req.body
    if (!Array.isArray(route) || route.length === 0) return res.status(400).send('route required')
    if (!['private','friends','groups'].includes(visibility)) return res.status(400).send('invalid visibility')

    const w = await db.query(`
      INSERT INTO walks (user_id, distance_m, duration_s, route, events, notes, visibility, created_at)
      VALUES ($1::uuid,$2,$3,$4::jsonb,$5::jsonb,$6,$7, now())
      RETURNING *
    `, [req.user.id, distance_m|0, duration_s|0, JSON.stringify(route), JSON.stringify(events), notes, visibility])

    const walk = w.rows[0]

    // Walk pets association — if your schema uses integer IDs instead of UUID for pets,
    // this insert may fail. It's wrapped in try/catch to avoid breaking walk creation.
    try {
      if (Array.isArray(pet_ids) && pet_ids.length) {
        await db.query(
          `INSERT INTO walk_pets (walk_id, pet_id)
           SELECT $1::uuid, p.id FROM pets p
           WHERE p.id = ANY($2::uuid[]) AND p.user_id = $3::uuid
           ON CONFLICT DO NOTHING`,
          [walk.id, pet_ids, req.user.id]
        )
      }
    } catch {}

    if (visibility === 'groups' && Array.isArray(group_ids) && group_ids.length) {
      await db.query(
        `INSERT INTO walk_shares (walk_id, group_id)
         SELECT $1::uuid, gm.group_id FROM group_members gm
         WHERE gm.user_id = $2::uuid AND gm.group_id = ANY($3::uuid[])
         ON CONFLICT DO NOTHING`,
        [walk.id, req.user.id, group_ids]
      )
    }

    res.json(walk)
  })

  app.get('/walks', authRequired, async (req,res) => {
    const limit = Math.min(Number(req.query.limit || 20), 100)
    const groupId = req.query.group_id ? String(req.query.group_id) : null

    const mutualSql = `
      EXISTS (
        SELECT 1 FROM user_follows f1
        JOIN user_follows f2 ON f2.follower_id = $1::uuid AND f2.followee_id = f1.follower_id
        WHERE f1.follower_id = w.user_id AND f1.followee_id = $1::uuid
      )
    `

    const base = `
      SELECT w.*,
        u.id as user_id, u.display_name, u.email, u.photo_url,
        COALESCE((
          SELECT json_agg(json_build_object('id',p.id,'name',p.name,'photo_url',p.photo_url))
          FROM walk_pets wp JOIN pets p ON p.id = wp.pet_id
          WHERE wp.walk_id = w.id
        ), '[]') AS pets,
        COALESCE((
          SELECT json_agg(json_build_object('group_id', ws.group_id, 'group_name', g.name))
          FROM walk_shares ws JOIN groups g ON g.id = ws.group_id
          WHERE ws.walk_id = w.id
        ), '[]') AS group_shares
      FROM walks w
      JOIN users u ON u.id = w.user_id
    `

    let rows
    if (groupId) {
      const q = base + `
        JOIN walk_shares sh ON sh.walk_id = w.id
        WHERE sh.group_id = $1::uuid
        ORDER BY w.created_at DESC
        LIMIT $2
      `
      rows = (await db.query(q, [groupId, limit])).rows
    } else {
      const q = base + `
        WHERE
          w.user_id = $1::uuid
          OR (w.visibility = 'friends' AND ${mutualSql})
          OR w.id IN (
            SELECT sh.walk_id FROM walk_shares sh
            JOIN group_members gm ON gm.group_id = sh.group_id
            WHERE gm.user_id = $1::uuid
          )
        ORDER BY w.created_at DESC
        LIMIT $2
      `
      rows = (await db.query(q, [req.user.id, limit])).rows
    }

    res.json(rows.map(r => ({
      id: r.id,
      user: { id: r.user_id, display_name: r.display_name, email: r.email, photo_url: r.photo_url },
      distance_m: r.distance_m, duration_s: r.duration_s, events: r.events, route: r.route,
      notes: r.notes, visibility: r.visibility,
      created_at: r.created_at, started_at: r.started_at,
      pets: r.pets, group_shares: r.group_shares
    })))
  })

  app.get('/walks/:id', authRequired, async (req,res) => {
    const id = req.params.id
    const r = await db.query(`
      SELECT w.*, u.id as user_id, u.display_name, u.email, u.photo_url
      FROM walks w JOIN users u ON u.id = w.user_id WHERE w.id = $1::uuid
    `, [id])
    if (!r.rows.length) return res.status(404).send('not found')
    const w = r.rows[0]

    if (String(w.user_id) !== String(req.user.id)) {
      if (w.visibility === 'private') return res.status(403).send('private')
      if (w.visibility === 'friends') {
        const mutual = (await db.query(`
          SELECT EXISTS (
            SELECT 1 FROM user_follows f1
            JOIN user_follows f2 ON f2.follower_id = $1::uuid AND f2.followee_id = f1.follower_id
            WHERE f1.follower_id = $2::uuid AND f1.followee_id = $1::uuid
          ) AS ok
        `, [req.user.id, w.user_id])).rows[0].ok
        if (!mutual) return res.status(403).send('friends-only')
      }
      if (w.visibility === 'groups') {
        const allowed = (await db.query(`
          SELECT EXISTS (
            SELECT 1 FROM walk_shares ws
            JOIN group_members gm ON gm.group_id = ws.group_id
            WHERE ws.walk_id = $1::uuid AND gm.user_id = $2::uuid
          ) AS ok
        `, [id, req.user.id])).rows[0].ok
        if (!allowed) return res.status(403).send('group-only')
      }
    }

    const pets = (await db.query(`
      SELECT p.id, p.name, p.photo_url
      FROM walk_pets wp JOIN pets p ON p.id = wp.pet_id
      WHERE wp.walk_id = $1::uuid
    `, [id])).rows
    const shares = (await db.query(`
      SELECT g.id as group_id, g.name as group_name
      FROM walk_shares ws JOIN groups g ON g.id = ws.group_id
      WHERE ws.walk_id = $1::uuid
    `, [id])).rows
    res.json({
      id: w.id, distance_m: w.distance_m, duration_s: w.duration_s, events: w.events, route: w.route,
      notes: w.notes, visibility: w.visibility,
      created_at: w.created_at, started_at: w.started_at,
      user: { id: w.user_id, display_name: w.display_name, email: w.email, photo_url: w.photo_url },
      pets, group_shares: shares
    })
  })
}
