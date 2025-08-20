import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import { api } from '../api.js'
import { fmtDist, fmtDur } from '../utils.js'
import L from 'leaflet'

// Custom icons
const dogIcon = new L.DivIcon({
  html: '<div style="font-size: 24px;">🐕</div>',
  className: 'dog-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
})

const finishIcon = new L.DivIcon({
  html: '<div style="font-size: 20px;">🏁</div>',
  className: 'finish-marker',
  iconSize: [25, 25],
  iconAnchor: [12, 12]
})

const poopIcon = new L.DivIcon({
  html: '<div style="font-size: 18px;">💩</div>',
  className: 'event-marker',
  iconSize: [22, 22],
  iconAnchor: [11, 11]
})

const peeIcon = new L.DivIcon({
  html: '<div style="font-size: 18px;">💧</div>',
  className: 'event-marker',
  iconSize: [22, 22],
  iconAnchor: [11, 11]
})

function WalkSummary({ walks, selectedWalk, onSelectWalk }) {
  if (!walks.length) {
    return (
      <div style={{ textAlign: 'center', padding: 16 }}>
        <div style={{ fontSize: '32px', marginBottom: 8 }}>🐾</div>
        <div className="small">No walks yet</div>
      </div>
    )
  }

  return (
    <div style={{ maxHeight: 200, overflow: 'auto' }}>
      {walks.map((walk, idx) => (
        <div 
          key={walk.id} 
          onClick={() => onSelectWalk(walk.id === selectedWalk?.id ? null : walk)}
          style={{
            padding: 8,
            borderRadius: 4,
            marginBottom: 4,
            cursor: 'pointer',
            backgroundColor: selectedWalk?.id === walk.id ? '#e8f5e8' : '#f5f5f5',
            border: selectedWalk?.id === walk.id ? '2px solid #4CAF50' : '1px solid #ddd'
          }}
        >
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="small">
              {new Date(walk.created_at).toLocaleDateString()}
            </span>
            <span className="small">
              {fmtDist(walk.distance_m)} • {fmtDur(walk.duration_s)}
            </span>
          </div>
          {walk.notes && (
            <div className="small" style={{ marginTop: 2, fontStyle: 'italic', color: '#666' }}>
              "{walk.notes.substring(0, 50)}{walk.notes.length > 50 ? '...' : ''}"
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function MapTab({ me }) {
  const [walks, setWalks] = useState([])
  const [selectedWalk, setSelectedWalk] = useState(null)
  const [mapCenter, setMapCenter] = useState([40.0, -74.0])
  const [showPanel, setShowPanel] = useState(true)

  useEffect(() => {
    if (!me) return
    api.walks.list(50).then(setWalks).catch(console.error)
    
    // Get user's current location for map center
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude])
        },
        () => console.log('Location access denied'),
        { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
      )
    }
  }, [me])

  const pathStyle = { color: '#4CAF50', weight: 4, opacity: 0.7 }
  const selectedPathStyle = { color: '#FF5722', weight: 6, opacity: 0.9 }

  if (!me) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        padding: 32
      }}>
        <div style={{ fontSize: '48px', marginBottom: 16 }}>🗺️</div>
        <h3>Map View</h3>
        <p className="small" style={{ color: '#666' }}>
          Sign in to see your walk routes on the map
        </p>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {/* Map */}
      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {walks.map(walk => {
          const pts = (walk.route || []).map(p => [p.lat, p.lon])
          const isSelected = selectedWalk?.id === walk.id
          const style = isSelected ? selectedPathStyle : pathStyle
          const events = walk.events || []
          
          return (
            <React.Fragment key={walk.id}>
              {/* Route polyline */}
              {pts.length > 1 && (
                <Polyline 
                  positions={pts} 
                  pathOptions={style}
                  eventHandlers={{
                    click: () => setSelectedWalk(selectedWalk?.id === walk.id ? null : walk)
                  }}
                />
              )}
              
              {/* Start marker (dog) */}
              {pts.length > 0 && (
                <Marker position={pts[0]} icon={dogIcon}>
                  <Popup>
                    <div>
                      <strong>Walk Start</strong><br/>
                      {new Date(walk.created_at).toLocaleString()}<br/>
                      Distance: {fmtDist(walk.distance_m)}<br/>
                      Duration: {fmtDur(walk.duration_s)}
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* End marker (finish flag) - only if different from start */}
              {pts.length > 1 && (
                <Marker position={pts[pts.length - 1]} icon={finishIcon}>
                  <Popup>
                    <div>
                      <strong>Walk End</strong><br/>
                      {new Date(walk.created_at).toLocaleString()}
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* Event markers - only show for selected walk to avoid clutter */}
              {isSelected && events.map((event, idx) => (
                <Marker
                  key={`${walk.id}-${idx}`}
                  position={[event.lat, event.lon]}
                  icon={event.type === 'poop' ? poopIcon : peeIcon}
                >
                  <Popup>
                    <div>
                      <strong>{event.type === 'poop' ? 'Poop' : 'Pee'} Event</strong><br/>
                      {new Date(event.occurred_at).toLocaleString()}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </React.Fragment>
          )
        })}
      </MapContainer>

      {/* Control Panel - Collapsible */}
      <div style={{ 
        position: 'absolute', 
        top: 12, 
        left: 12,
        maxWidth: 300,
        backgroundColor: 'white',
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>
        {/* Panel Header */}
        <div 
          onClick={() => setShowPanel(!showPanel)}
          style={{
            padding: 12,
            cursor: 'pointer',
            borderBottom: showPanel ? '1px solid #eee' : 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div><strong>My Walks</strong></div>
            <div className="small">
              {walks.length} total • {selectedWalk ? 'Selected' : 'Click to select'}
            </div>
          </div>
          <div style={{ fontSize: '16px' }}>
            {showPanel ? '▼' : '▶'}
          </div>
        </div>

        {/* Panel Content */}
        {showPanel && (
          <div style={{ padding: 12 }}>
            <WalkSummary 
              walks={walks} 
              selectedWalk={selectedWalk}
              onSelectWalk={setSelectedWalk}
            />
            
            {selectedWalk && (
              <div style={{ 
                marginTop: 12, 
                padding: 8, 
                backgroundColor: '#f9f9f9', 
                borderRadius: 4 
              }}>
                <div className="small"><strong>Selected Walk Details:</strong></div>
                <div className="small">
                  Events: {(selectedWalk.events || []).filter(e => e.type === 'poop').length} 💩, {(selectedWalk.events || []).filter(e => e.type === 'pee').length} 💧
                </div>
                {selectedWalk.pets && selectedWalk.pets.length > 0 && (
                  <div className="small">
                    Dogs: {selectedWalk.pets.map(p => p.name).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'white',
        padding: 8,
        borderRadius: 4,
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        fontSize: '12px'
      }}>
        <div><strong>Legend:</strong></div>
        <div>🐕 Start • 🏁 Finish</div>
        <div>💩 Poop • 💧 Pee</div>
        <div className="small">(Events show for selected walk)</div>
      </div>
    </div>
  )
}
