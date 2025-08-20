import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api.js'

const STORE_KEY = 'pupwalks.walk.v2'
const SETTINGS_KEY = 'pupwalks.settings.v1'

function haversine(a, b) {
  const toRad = v => (v * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

const Ctx = createContext(null)
export const useWalk = () => useContext(Ctx)

function loadSettings() { 
  try { 
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {} 
  } catch { 
    return {} 
  } 
}

function saveSettings(s) { 
  try { 
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) 
  } catch {
    console.warn('Failed to save settings to localStorage')
  } 
}

export function WalkProvider({ children }) {
  const [active, setActive] = useState(false)
  const [paused, setPaused] = useState(false)
  const [route, setRoute] = useState([])
  const [events, setEvents] = useState([])
  const [distance, setDistance] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [petIds, setPetIds] = useState([])

  const [autoPauseOnHide, setAutoPauseOnHide] = useState(() => {
    const s = loadSettings()
    return s.autoPauseOnHide ?? true
  })
  
  useEffect(() => { 
    const s = loadSettings()
    saveSettings({ ...s, autoPauseOnHide }) 
  }, [autoPauseOnHide])

  const watchId = useRef(null)
  const ticker = useRef(null)
  const t0 = useRef(null)
  const pausedAt = useRef(null)
  const pauseAccum = useRef(0)
  const saveTimer = useRef(null)

  const clearTicker = () => { 
    if (ticker.current) { 
      clearInterval(ticker.current)
      ticker.current = null 
    } 
  }
  
  const computeElapsedMs = () => {
    if (!t0.current) return 0
    const now = Date.now()
    const pausedBlock = paused && pausedAt.current ? (now - pausedAt.current) : 0
    return (now - t0.current) - pauseAccum.current - pausedBlock
  }
  
  const startTicker = () => { 
    clearTicker()
    ticker.current = setInterval(() => setElapsed(Math.floor(Math.max(0, computeElapsedMs()) / 1000)), 1000) 
  }
  
  const startWatch = () => {
    if (!('geolocation' in navigator) || watchId.current) return
    
    const options = { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    
    navigator.geolocation.getCurrentPosition(onPos, onError, options)
    watchId.current = navigator.geolocation.watchPosition(onPos, onError, options)
  }
  
  const stopWatch = () => { 
    if (watchId.current) { 
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null 
    } 
  }

  function onPos(pos) {
    if (!active || paused) return
    const c = { lat: pos.coords.latitude, lon: pos.coords.longitude, t: Date.now() }
    setRoute(prev => {
      if (!prev.length) return [c]
      const d = haversine(prev[prev.length - 1], c)
      setDistance(x => x + d)
      return [...prev, c]
    })
  }

  function onError(error) {
    console.warn('Geolocation error:', error)
  }

  function start() {
    if (active) return
    setRoute([])
    setEvents([])
    setDistance(0)
    setElapsed(0)
    setPaused(false)
    pauseAccum.current = 0
    pausedAt.current = null
    t0.current = Date.now()
    setActive(true)
    startTicker()
    startWatch()
    queueSave(0)
  }

  function pause() { 
    if (!active || paused) return
    setPaused(true)
    pausedAt.current = Date.now()
    clearTicker()
    queueSave(0) 
  }
  
  function resume() {
    if (!active || !paused) return
    if (pausedAt.current) pauseAccum.current += (Date.now() - pausedAt.current)
    pausedAt.current = null
    setPaused(false)
    startTicker()
    startWatch()
    queueSave(0)
  }
  
  function togglePause() { 
    paused ? resume() : pause() 
  }

  async function finish(opts = {}) {
    if (!active) return
    const finalMs = Math.max(0, computeElapsedMs())
    setElapsed(Math.floor(finalMs / 1000))
    stopWatch()
    clearTicker()
    
    if (!route.length) { 
      reset()
      return 
    }
    
    try {
      await api.walks.create({
        pet_ids: petIds,
        route,
        distance_m: Math.round(distance),
        duration_s: Math.floor(finalMs / 1000),
        events,
        notes: opts.notes || '',
        privacy: opts.visibility || 'private', // Note: backend uses 'privacy' not 'visibility'
        group_ids: Array.isArray(opts.group_ids) ? opts.group_ids : []
      })
    } catch (error) {
      console.error('Failed to save walk:', error)
      throw error
    } finally { 
      reset() 
    }
  }

  function reset() {
    setActive(false)
    setPaused(false)
    setRoute([])
    setEvents([])
    setDistance(0)
    setElapsed(0)
    t0.current = null
    pausedAt.current = null
    pauseAccum.current = 0
    stopWatch()
    clearTicker()
    try { 
      localStorage.removeItem(STORE_KEY) 
    } catch {
      console.warn('Failed to clear walk data from localStorage')
    }
  }

  function drop(type) {
    const last = route.at(-1)
    if (!last) return
    setEvents(prev => [...prev, { 
      type, 
      lat: last.lat, 
      lon: last.lon, 
      occurred_at: new Date().toISOString() 
    }])
  }

  function saveNow() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        active, paused, route, events, distance, petIds,
        t0: t0.current, pausedAt: pausedAt.current, pauseAccum: pauseAccum.current, savedAt: Date.now()
      }))
    } catch {
      console.warn('Failed to save walk data to localStorage')
    }
  }
  
  function queueSave(delay = 400) { 
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(saveNow, delay) 
  }

  // Load saved state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (!raw) return
      const s = JSON.parse(raw)
      if (!s || !s.t0) return
      
      t0.current = s.t0
      pauseAccum.current = s.pauseAccum || 0
      pausedAt.current = s.paused ? (s.pausedAt || Date.now()) : null
      
      setActive(!!s.active)
      setPaused(!!s.paused)
      setRoute(Array.isArray(s.route) ? s.route : [])
      setEvents(Array.isArray(s.events) ? s.events : [])
      setDistance(Number(s.distance || 0))
      setPetIds(Array.isArray(s.petIds) ? s.petIds : [])
      
      const ms = Math.max(0, (Date.now() - s.t0) - (s.pauseAccum || 0) - (s.paused && s.pausedAt ? (Date.now() - s.pausedAt) : 0))
      setElapsed(Math.floor(ms / 1000))
      
      if (s.active) { 
        if (!s.paused) startTicker()
        startWatch() 
      }
    } catch (error) {
      console.warn('Failed to restore walk state:', error)
    }
  }, [])

  // Save state when it changes
  useEffect(() => { 
    if (active) queueSave() 
  }, [active, paused, route.length, events.length, distance, elapsed, petIds])

  // Handle visibility changes
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        if (active && autoPauseOnHide && !paused) { 
          pausedAt.current = Date.now()
          setPaused(true)
          clearTicker() 
        }
        queueSave(0)
      } else { 
        if (active && !paused) startTicker()
        queueSave(0) 
      }
    }
    
    const onBeforeUnload = () => saveNow()
    
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onBeforeUnload)
    window.addEventListener('beforeunload', onBeforeUnload)
    
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', onBeforeUnload)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [active, paused, autoPauseOnHide])

  // Cleanup on unmount
  useEffect(() => () => { 
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current)
    clearTicker() 
  }, [])

  const value = useMemo(() => ({
    active, paused, route, events, distance, elapsed, petIds,
    setPetIds, start, pause, resume, togglePause, finish, drop,
    autoPauseOnHide, setAutoPauseOnHide,
  }), [active, paused, route, events, distance, elapsed, petIds, autoPauseOnHide])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}