const BASE = import.meta.env.VITE_API_URL || (location.hostname === 'localhost'
  ? 'http://localhost:4000'
  : `https://${location.hostname.replace(/^app\.|^www\./,'api.')}`)

// Token management
export const getToken = () => {
  try {
    return localStorage.getItem('pupwalks_token')
  } catch {
    return null
  }
}

export const setToken = (token) => {
  try {
    if (token) {
      localStorage.setItem('pupwalks_token', token)
    } else {
      localStorage.removeItem('pupwalks_token')
    }
  } catch {}
}

async function j(method, path, body, extra={}) {
  const init = { method, credentials: 'include', headers: { ...extra.headers } }
  
  // Add Authorization header if token exists
  const token = getToken()
  if (token) {
    init.headers['Authorization'] = `Bearer ${token}`
  }
  
  if (body && !(body instanceof FormData)) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  } else if (body instanceof FormData) {
    init.body = body
  }
  
  const r = await fetch(`${BASE}/api${path}`, init)
  if (!r.ok) throw new Error((await r.text()) || `HTTP ${r.status}`)
  const ct = r.headers.get('content-type') || ''
  return ct.includes('application/json') ? r.json() : r.text()
}

export const absUrl = (u) => (!u || /^https?:\/\//i.test(u)) ? u : `${BASE}${u}`

export const api = {
  base: BASE,
  
  // Auth
  me: () => j('GET', '/me'),
  login: (email, password) => j('POST', '/auth/login', { email, password }),
  register: (email, password, display_name) => j('POST', '/auth/register', { email, password, display_name }),
  
  // File uploads
  upload: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return j('POST', '/upload', fd)
  },
  
  // Pets
  pets: {
    list: () => j('GET', '/pets'),
    create: (data) => j('POST', '/pets', data),
    delete: (id) => j('DELETE', `/pets/${id}`),
  },
  
  // Walks
  walks: {
    create: (data) => j('POST', '/walks', data),
    list: (limit = 20, groupId = null) => {
      const qp = new URLSearchParams({ limit: String(limit) })
      if (groupId) qp.set('group_id', String(groupId))
      return j('GET', `/walks?${qp.toString()}`)
    },
    get: (id) => j('GET', `/walks/${id}`),
  },
  
  // Profile
  profile: {
    update: (patch) => j('PUT', '/me', patch),
    uploadPhoto: (file) => {
      const fd = new FormData()
      fd.append('photo', file)
      return j('POST', '/me/photo', fd)
    }
  },
  
  // Groups/Social
  groups: {
    listPublic: () => j('GET', '/groups'),
    mine: () => j('GET', '/groups/mine'),
    create: (data) => j('POST', '/groups', data),
    join: (id) => j('POST', `/groups/${id}/join`, {}),
    leave: (id) => j('POST', `/groups/${id}/leave`, {}),
    myJoinRequests: () => j('GET', '/groups/requests/mine')
  },
  
  users: {
    search: (q) => j('GET', `/users/search?q=${encodeURIComponent(q||'')}`),
    follow: (id) => j('POST', `/users/${id}/follow`, {}),
    unfollow: (id) => j('POST', `/users/${id}/unfollow`, {}),
    whoami: () => j('GET', '/users/me/relations')
  }
}
