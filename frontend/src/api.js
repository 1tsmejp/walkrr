const BASE = import.meta.env.VITE_API_BASE || (location.hostname === 'localhost'
  ? 'http://localhost:4000'
  : `https://${location.hostname.replace(/^app\.|^www\./,'api.')}`)

async function j(method, path, body, extra={}) {
  const init = { method, credentials: 'include', headers: { ...extra.headers } }
  if (body && !(body instanceof FormData)) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  } else if (body instanceof FormData) {
    init.body = body
  }
  const r = await fetch(`${BASE}${path}`, init)
  if (!r.ok) throw new Error((await r.text()) || `HTTP ${r.status}`)
  const ct = r.headers.get('content-type') || ''
  return ct.includes('application/json') ? r.json() : r.text()
}

export const absUrl = (u) => (!u || /^https?:\/\//i.test(u)) ? u : `${BASE}${u}`

export const api = {
  base: BASE,
  me: () => j('GET','/me'),
  auth: {
    login: (b) => j('POST','/auth/login', b),
    signup: (b) => j('POST','/auth/signup', b),
    logout: () => j('POST','/auth/logout', {}),
  },
  pets: {
    list: () => j('GET','/pets'),
    create: (b) => j('POST','/pets', b),
    photo: (id, file) => { const fd = new FormData(); fd.append('photo', file); return j('POST', `/pets/${id}/photo`, fd) },
  },
  walks: {
    // body may include: {route, events, pet_ids, distance_m, duration_s, notes, visibility, group_ids}
    create: (b) => j('POST','/walks', b),
    list: (limit=20, groupId=null) => {
      const qp = new URLSearchParams({ limit: String(limit) })
      if (groupId) qp.set('group_id', String(groupId))
      return j('GET', `/walks?${qp.toString()}`)
    },
    get: (id) => j('GET', `/walks/${id}`),
  },
  profile: {
    update: (patch) => j('PUT','/me', patch),
    uploadPhoto: (file) => { const fd = new FormData(); fd.append('photo', file); return j('POST','/me/photo', fd) }
  },
  groups: {
    listPublic: () => j('GET','/groups'),              // public + approval
    mine: () => j('GET','/groups/mine'),
    create: (b) => j('POST','/groups', b),             // {name, description, privacy}
    join:   (id) => j('POST', `/groups/${id}/join`,{}), // public: join; approval: request
    leave:  (id) => j('POST', `/groups/${id}/leave`,{}),
    myJoinRequests: () => j('GET','/groups/requests/mine')
  },
  users: {
    search: (q) => j('GET', `/users/search?q=${encodeURIComponent(q||'')}`),
    follow: (id) => j('POST', `/users/${id}/follow`,{}),
    unfollow: (id) => j('POST', `/users/${id}/unfollow`,{}),
    whoami: () => j('GET','/users/me/relations')  // {followingIds:[], followerIds:[], mutualIds:[]}
  }
}
