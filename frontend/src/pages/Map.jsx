import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import { api } from '../api.js'
import { fmtDist, fmtDur } from '../utils.js'

export function MapTab({ me }) {
  const [walks, setWalks] = useState([])

  useEffect(()=>{
    if (!me) return;
    api.walks.list(true).then(setWalks).catch(()=>{})
  },[me])

  const pathStyle = { color: '#7c4dff', weight: 4 }

  return (
    <div style={{ height: '100%' }}>
      <MapContainer center={[40.0, -74.0]} zoom={13}>
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'
        />
        {walks.map(w => {
          const pts = (w.route || []).map(p => [p.lat, p.lon])
          return (
            <React.Fragment key={w.id}>
              {pts.length > 1 && <Polyline positions={pts} pathOptions={pathStyle} />}
              {pts.length ? <Marker position={pts[0]}><Popup>Start</Popup></Marker> : null}
              {pts.length ? <Marker position={pts[pts.length-1]}><Popup>End</Popup></Marker> : null}
            </React.Fragment>
          )
        })}
      </MapContainer>

      <div style={{ position:'absolute', top: 8, left: 8 }} className="card">
        <div><b>My Walks</b></div>
        <div className="small">Total: {walks.length}</div>
        <div style={{ maxHeight: 160, overflow:'auto', marginTop: 6 }}>
          {walks.map(w=>(
            <div key={w.id} className="row" style={{ justifyContent:'space-between' }}>
              <span>{new Date(w.created_at).toLocaleString()}</span>
              <span>{fmtDist(w.distance_m)} • {fmtDur(w.duration_s)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
