const BASE = 'https://api.walkrr.patti.tech'

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

async function j(method, path, body, extra = {}) {
  const init = { 
    method, 
    credentials: 'include',
    headers: { 
      ...extra.headers 
    }
  }
  
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
  
  const url = `${BASE}${path}`
  
  try {
    const r = await fetch(url, init)
    if (!r.ok) {
      const errorText = await r.text()
      throw new Error(errorText || `HTTP ${r.status}`)
    }
    const ct = r.headers.get('content-type') || ''
    return ct.includes('application/json') ? r.json() : r.text()
  } catch (error) {
    console.error('API Request failed:', { url, method, error })
    throw error
  }
}

export const absUrl = (u) => {
  if (!u || /^https?:\/\//i.test(u)) return u
  if (u.startsWith('/uploads')) {
    return `${BASE}${u}`
  }
  return `${BASE}${u}`
}

export const api = {
  base: BASE,
  me: () => j('GET', '/api/me'),
  login: (email, password) => j('POST', '/api/auth/login', { email, password }),
  register: (email, password, display_name) => j('POST', '/api/auth/register', { email, password, display_name }),
  
  upload: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return j('POST', '/api/upload', fd)
  },
  
  pets: {
    list: () => j('GET', '/api/pets'),
    create: (data) => j('POST', '/api/pets', data),
    delete: (id) => j('DELETE', `/api/pets/${id}`),
  },
  
  walks: {
    create: (data) => j('POST', '/api/walks', data),
    list: (limit = 20, groupId = null) => {
      const qp = new URLSearchParams({ limit: String(limit) })
      if (groupId) qp.set('group_id', String(groupId))
      return j('GET', `/api/walks?${qp.toString()}`)
    },
    get: (id) => j('GET', `/api/walks/${id}`),
  }
}
