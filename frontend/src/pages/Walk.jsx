import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { api, absUrl } from '../api.js'
import { fmtDist, fmtDur } from '../utils.js'
import { useWalk } from '../walkContext.jsx'

function FollowMap({ lastPos }) {
  const map = useMap()
  useEffect(() => { if (lastPos) map.setView([lastPos.lat, lastPos.lon], Math.max(map.getZoom(), 17), { animate: true }) }, [lastPos, map])
  return null
}
function AutoLocate() {
  const map = useMap()
  useEffect(() => {
    const fallback = [40.7128, -74.006]
    if (!('geolocation' in navigator)) { map.setView(fallback, 13); return }
    navigator.geolocation.getCurrentPosition(
      pos => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
      ()   => map.setView(fallback, 13),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [map])
  return null
}
function paceText(m, s) { if (!m || m < 1 || !s) return '--'; const mi = m / 1609.344; return `${((s/60)/mi).toFixed(1)} min/mi` }
const emojiHTML = (e) => `<span class="emoji-font">${e}</span>`
const emojiIcon = (e) => L.divIcon({ className: 'emoji-marker emoji-font', html: emojiHTML(e), iconSize: [24,24], iconAnchor:[12,12] })

export function WalkTab({ me }) {
  const { active, paused, route, events, distance, elapsed, petIds, setPetIds, start, togglePause, finish, drop } = useWalk()
  const [pets, setPets] = useState([])
  const [collapsed, setCollapsed] = useState(false)

  const [showComplete, setShowComplete] = useState(false)
  const [notes, setNotes] = useState('')
  const [groups, setGroups] = useState([])
  const [shareIds, setShareIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [visibility, setVisibility] = useState('private') // 'private'|'friends'|'groups'

  useEffect(() => { if (me) api.pets.list().then(setPets).catch(()=>{}) }, [me])
  useEffect(() => { if (showComplete) api.groups.mine().then(setGroups).catch(()=>{}) }, [showComplete])

  useEffect(() => { const t = window.twemoji; if (t && typeof t.parse === 'function') t.parse(document.body, { folder: 'svg', ext: '.svg' }) }, [route.length, events.length, collapsed])

  const positions = useMemo(() => route.map(p => [p.lat, p.lon]), [route])
  const lastPos = route.at(-1)
  const dogIcon = useMemo(() => L.divIcon({ className: 'dog-marker emoji-font', html: emojiHTML('??'), iconSize: [32,32], iconAnchor:[16,16] }), [])

  async function submitFinish() {
    if (visibility === 'groups' && shareIds.length === 0) {
      if (!confirm('No communities selected. Save as Private instead?')) return
      setVisibility('private')
    }
    setSaving(true)
    try {
      await finish({ notes, group_ids: visibility==='groups' ? shareIds : [], visibility })
      setShowComplete(false); setNotes(''); setShareIds([]); setVisibility('private')
      alert('Walk saved!')
    } catch (e) {
      alert(e.message || 'Failed to save walk')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <MapContainer center={[40, -74]} zoom={15} minZoom={3} maxZoom={18}>
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'
        />
        <AutoLocate />
        {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: '#00bcd4', weight: 5 }} />}
        {positions.length ? <Marker position={positions[0]} icon={emojiIcon('??')}><Popup>Start</Popup></Marker> : null}
        {positions.length ? <Marker position={positions[positions.length - 1]} icon={dogIcon}><Popup>Walking buddy ??</Popup></Marker> : null}
        {events.map((ev, i) => (
          <Marker key={i} position={[ev.lat, ev.lon]} icon={emojiIcon(ev.type === 'poop' ? '??' : ev.type === 'pee' ? '??' : '??')}>
            <Popup>{ev.type === 'poop' ? '?? Poop' : ev.type === 'pee' ? '?? Pee' : '?? Water'}<br />{new Date(ev.occurred_at).toLocaleTimeString()}</Popup>
          </Marker>
        ))}
        <FollowMap lastPos={lastPos} />
      </MapContainer>

      {/* Bottom sheet */}
      <div
        className={`walk-sheet card ${collapsed ? 'min' : ''}`}
        style={{ position:'fixed', left:'50%', transform:'translateX(-50%)', bottom:'calc(var(--tabs-h) + env(safe-area-inset-bottom, 0px) + 8px)', width:'calc(100% - 24px)', maxWidth:520, zIndex:3000 }}
      >
        <div className="sheet-handle" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}><div className="grabber" /></div>

        <div className="stat-row">
          <div className="stat"><div>Time</div><b>{fmtDur(elapsed)}</b></div>
          <div className="stat"><div>Distance</div><b>{fmtDist(distance)}</b></div>
          <div className="stat"><div>Pace</div><b>{paceText(distance, elapsed)}</b></div>
        </div>

        <div className="sheet-body">
          <div>
            <label>Walk with:</label>
            <div className="pet-avatars">
              {pets.map(p => (
                <img key={p.id} src={absUrl(p.photo_url) || 'https://placehold.co/64x64'} title={p.name}
                  onClick={() => setPetIds(ids => ids.includes(p.id) ? ids.filter(i => i !== p.id) : [...ids, p.id])}
                  style={{ outline: petIds.includes(p.id) ? '3px solid #00bcd4' : 'none', cursor:'pointer' }}/>
              ))}
            </div>
          </div>

          {!active ? (
            <div style={{ marginTop: 8 }}>
              <button className="button emoji-font" onClick={start}>?? Start Walk</button>
            </div>
          ) : (
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <button className="button emoji-font" onClick={togglePause}>{paused ? '?? Resume' : '?? Pause'}</button>
              <button className="button emoji-font" onClick={() => setShowComplete(true)}>?? Finish</button>
            </div>
          )}

          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <div className="chip chip-poop emoji-font"  onClick={() => drop('poop')}>??</div>
            <div className="chip chip-pee  emoji-font"  onClick={() => drop('pee')}>??</div>
            <div className="chip chip-water emoji-font" onClick={() => drop('water')}>??</div>
          </div>
        </div>
      </div>

      {collapsed && active && !paused && (
        <div className="chips chips-compact">
          <div className="chip chip-poop emoji-font"  onClick={() => drop('poop')}>??</div>
          <div className="chip chip-pee  emoji-font"  onClick={() => drop('pee')}>??</div>
          <div className="chip chip-water emoji-font" onClick={() => drop('water')}>??</div>
        </div>
      )}

      {/* Complete Walk modal */}
      {showComplete && (
        <div className="modal">
          <div className="modal-card">
            <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
              <b>Complete Walk</b>
              <button className="button" onClick={() => setShowComplete(false)}>Cancel</button>
            </div>

            <div className="row" style={{ gap:12, marginTop:12, flexWrap:'wrap' }}>
              <div className="stat"><div className="small">Distance</div><b>{fmtDist(distance)}</b></div>
              <div className="stat"><div className="small">Duration</div><b>{fmtDur(elapsed)}</b></div>
              {events.length ? <div className="stat"><div className="small">Events</div><b>{events.length}</b></div> : null}
            </div>

            <label style={{ marginTop:12 }}>Notes</label>
            <textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="How did the walk go? Terrain, behavior, weather…"/>

            <label style={{ marginTop:12 }}>Visibility</label>
            <div className="segmented">
              <button className={visibility==='private'?'active':''} onClick={()=>setVisibility('private')}>Private</button>
              <button className={visibility==='friends'?'active':''} onClick={()=>setVisibility('friends')}>Friends-only</button>
              <button className={visibility==='groups'?'active':''} onClick={()=>setVisibility('groups')}>Community</button>
            </div>

            {visibility === 'groups' && (
              <div className="card" style={{ marginTop:12 }}>
                <b>Share to Communities</b>
                {groups.length === 0 ? (
                  <div className="small" style={{ marginTop:6 }}>You’re not in any groups yet. Join from the Feed tab.</div>
                ) : (
                  <div className="grid" style={{ marginTop:8 }}>
                    {groups.map(g => (
                      <label key={g.id} className="row" style={{ justifyContent:'space-between' }}>
                        <span>{g.name} {g.privacy!=='public' ? <span className="small">({g.privacy})</span> : null}</span>
                        <input type="checkbox"
                          checked={shareIds.includes(g.id)}
                          onChange={e => setShareIds(x => e.target.checked ? [...x, g.id] : x.filter(id=>id!==g.id))}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="row" style={{ gap:8, marginTop:12 }}>
              <button className="button" onClick={submitFinish} disabled={saving}>{saving ? 'Saving…' : 'Save Walk'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
