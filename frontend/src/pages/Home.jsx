import React, { useEffect, useState } from 'react'
import { useWalk } from '../walkContext.jsx'
import { fmtDist, fmtDur } from '../utils.js'

export function HomeTab({ me, goWalk }) {
  const { active, paused, distance, elapsed, start, togglePause } = useWalk()

  const [wx, setWx] = useState(null)
  const [wxErr, setWxErr] = useState(null)
  const [coords, setCoords] = useState({ lat: 40.7128, lon: -74.0060 }) // default NYC
  const [unit, setUnit] = useState(() => localStorage.getItem('wx_unit') || 'f') // 'f' | 'c'

  function fetchWx(u, lat, lon) {
    const temperature_unit = u === 'f' ? 'fahrenheit' : 'celsius'
    const wind_speed_unit = u === 'f' ? 'mph' : 'ms'
    const precipitation_unit = u === 'f' ? 'inch' : 'mm'
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,wind_speed_10m,precipitation` +
      `&temperature_unit=${temperature_unit}&wind_speed_unit=${wind_speed_unit}` +
      `&precipitation_unit=${precipitation_unit}&timezone=auto`
    fetch(url).then(r => r.json()).then(setWx).catch(e => setWxErr(e.message))
  }

  // get location then fetch (initial)
  useEffect(() => {
    const insecure = location.protocol !== 'https:' && location.hostname !== 'localhost'
    const loadAt = (lat, lon, msg) => {
      if (msg) setWxErr(msg)
      setCoords({ lat, lon })
      fetchWx(unit, lat, lon)
    }
    if (insecure) {
      loadAt(40.7128, -74.0060, 'Enable HTTPS to use your precise location — showing NYC')
      return
    }
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => loadAt(pos.coords.latitude, pos.coords.longitude, null),
        () => loadAt(40.7128, -74.0060, 'Location denied — showing NYC'),
        { enableHighAccuracy: true, timeout: 8000 }
      )
    } else {
      loadAt(40.7128, -74.0060, 'No geolocation — showing NYC')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // refetch when unit changes
  useEffect(() => {
    localStorage.setItem('wx_unit', unit)
    fetchWx(unit, coords.lat, coords.lon)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit])

  const current = wx?.current
  const units = wx?.current_units || {}
  const greet = me?.display_name || me?.email || 'friend'

  return (
    <div className="home-hero">
      <div className="card">
        <div style={{ fontSize: 20, fontWeight: 800 }}>Hi, {greet} ??</div>
        <div className="small">Ready for a walk?</div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
          <b>Weather</b>
          <div className="segmented">
            <button className={unit==='f' ? 'active' : ''} onClick={()=>setUnit('f')}>°F</button>
            <button className={unit==='c' ? 'active' : ''} onClick={()=>setUnit('c')}>°C</button>
          </div>
        </div>
        {wxErr && <div className="small" style={{ marginTop: 4 }}>({wxErr})</div>}
        {current ? (
          <div className="weather" style={{ marginTop: 8 }}>
            <div>
              <div className="big">
                {Math.round(current.temperature_2m)}°
              </div>
              <div className="small">
                Feels {Math.round(current.apparent_temperature)}°
              </div>
            </div>
            <div>
              <div className="small">
                Wind: {current.wind_speed_10m} {units.wind_speed_10m || (unit==='f' ? 'mph' : 'm/s')}
              </div>
              <div className="small">
                Precip: {current.precipitation ?? 0} {units.precipitation || (unit==='f' ? 'in' : 'mm')}
              </div>
            </div>
          </div>
        ) : (
          <div className="small" style={{ marginTop: 8 }}>Loading current conditions…</div>
        )}
      </div>

      <div className="card persistent-mini">
        <div className="row" style={{ justifyContent:'space-between' }}>
          <b>{active ? (paused ? 'Walk paused' : 'Walk in progress') : 'No active walk'}</b>
          <div className="small">{fmtDist(distance)} • {fmtDur(elapsed)}</div>
        </div>
        {!active ? (
          <div style={{ marginTop: 8 }}>
            <button className="button" onClick={()=>{ /* start & jump to Walk tab */ start(); goWalk?.() }}>? Start Walk</button>
          </div>
        ) : (
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button className="button" onClick={togglePause}>{paused ? '? Resume' : '? Pause'}</button>
            <button className="button" onClick={goWalk}>Open Walk Tab</button>
          </div>
        )}
      </div>
    </div>
  )
}
