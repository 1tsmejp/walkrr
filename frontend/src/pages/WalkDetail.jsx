import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { api, absUrl } from '../api.js'
import { fmtDist, fmtDur } from '../utils.js'

const emojiHTML = (e) => `<span class="emoji-font">${e}</span>`
const emojiIcon = (e) => L.divIcon({ className: 'emoji-marker emoji-font', html: emojiHTML(e), iconSize: [24,24], iconAnchor:[12,12] })
const dogIcon = L.divIcon({ className: 'dog-marker emoji-font', html: emojiHTML('??'), iconSize: [28,28], iconAnchor:[14,14] })

function FitToRoute({ pts }) {
  const map = useMap()
  useEffect(() => { if (pts?.length) map.fitBounds(L.latLngBounds(pts.map(([lat, lon]) => [lat, lon])), { padding: [20,20] }) }, [pts, map])
  return null
}

export function WalkDetail({ id, onClose }) {
  const [walk, setWalk] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { setLoading(true); api.walks.get(id).then(setWalk).catch(()=>{}).finally(()=>setLoading(false)) }, [id])
  useEffect(() => { const t = window.twemoji; if (t && typeof t.parse === 'function') t.parse(document.body, { folder:'svg', ext: '.svg' }) }, [walk])

  const pts = useMemo(() => (walk?.route || []).map(p => [p.lat, p.lon]), [walk])
  const start = pts[0]; const end = pts[pts.length-1]

  return (
    <div className="modal">
      <div className="modal-card">
        <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
          <b>Walk details</b>
          <button className="button" onClick={onClose}>Close</button>
        </div>

        {loading && <div className="small" style={{ marginTop: 8 }}>Loading…</div>}
        {!loading && walk && (
          <>
            <div className="row" style={{ gap: 12, marginTop: 10, flexWrap:'wrap' }}>
              <div className="stat"><div className="small">Date</div><b>{new Date(walk.started_at || walk.created_at).toLocaleString()}</b></div>
              <div className="stat"><div className="small">Distance</div><b>{fmtDist(walk.distance_m)}</b></div>
              <div className="stat"><div className="small">Duration</div><b>{fmtDur(walk.duration_s)}</b></div>
              <div className="stat"><div className="small">Visibility</div><b>{walk.visibility || 'private'}</b></div>
              {walk.events?.length ? <div className="stat"><div className="small">Events</div><b>{walk.events.length}</b></div> : null}
            </div>

            {walk.notes && (
              <div className="card" style={{ marginTop: 12 }}>
                <b>Notes</b>
                <div style={{ marginTop: 6 }}>{walk.notes}</div>
              </div>
            )}

            <div className="static-map">
              <MapContainer center={start || [40.7128, -74.006]} zoom={13} zoomControl={false}
                attributionControl={true} dragging={true} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={true}
                style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" attribution='Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'/>
                <FitToRoute pts={pts} />
                {pts.length > 1 && <Polyline positions={pts} pathOptions={{ color: '#00bcd4', weight: 5 }} />}
                {start && <Marker position={start} icon={emojiIcon('??')}><Popup>Start</Popup></Marker>}
                {end && <Marker position={end} icon={dogIcon}><Popup>Finish</Popup></Marker>}
                {(walk.events || []).map((ev, i) => (
                  <Marker key={i} position={[ev.lat, ev.lon]} icon={emojiIcon(ev.type === 'poop' ? '??' : ev.type === 'pee' ? '??' : '??')}>
                    <Popup>{ev.type === 'poop' ? '?? Poop' : ev.type === 'pee' ? '?? Pee' : '?? Water'}<br />{new Date(ev.occurred_at).toLocaleTimeString()}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {(walk.pets?.length || 0) > 0 && (
              <div className="card" style={{ marginTop: 12 }}>
                <b>Pets</b>
                <div className="walk-pets" style={{ marginTop: 8 }}>
                  {walk.pets.map(p => (
                    <div key={p.id} className="row" style={{ gap:8, alignItems:'center' }}>
                      <img src={absUrl(p.photo_url) || 'https://placehold.co/32x32'} alt={p.name} style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', border:'1px solid var(--border)' }} />
                      <div>{p.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
