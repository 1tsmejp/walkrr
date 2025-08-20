import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet'
import { useWalk } from '../walkContext.jsx'
import { fmtDist, fmtDur } from '../utils.js'
import { api, getToken } from '../api.js'
import L from 'leaflet'

// Custom dog icon for start marker
const dogIcon = new L.DivIcon({
  html: '<div style="font-size: 24px;">??</div>',
  className: 'dog-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
})

// Custom icons for events
const poopIcon = new L.DivIcon({
  html: '<div style="font-size: 20px;">??</div>',
  className: 'event-marker',
  iconSize: [25, 25],
  iconAnchor: [12, 12]
})

const peeIcon = new L.DivIcon({
  html: '<div style="font-size: 20px;">??</div>',
  className: 'event-marker',
  iconSize: [25, 25],
  iconAnchor: [12, 12]
})

const currentLocationIcon = new L.DivIcon({
  html: '<div style="background: #4CAF50; border: 3px solid white; border-radius: 50%; width: 16px; height: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  className: 'current-location-marker',
  iconSize: [22, 22],
  iconAnchor: [11, 11]
})

function DogSelector({ selectedPets, onSelectionChange, user }) {
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && getToken()) {
      setLoading(true)
      api.pets.list()
        .then(setPets)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [user])

  if (loading) {
    return (
      <div className="small" style={{ color: '#666', fontStyle: 'italic' }}>
        Loading your dogs...
      </div>
    )
  }

  if (!pets.length) {
    return (
      <div>
        <div className="small" style={{ color: '#666', fontStyle: 'italic', marginBottom: 8 }}>
          No dogs found. Add dogs in the Dogs tab first.
        </div>
        <button 
          onClick={() => window.location.hash = '#dogs'}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          Add Your First Dog
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="small" style={{ marginBottom: 8, fontWeight: '500' }}>Walking with:</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {pets.map(pet => (
          <button
            key={pet.id}
            onClick={() => {
              const newSelection = selectedPets.includes(pet.id)
                ? selectedPets.filter(id => id !== pet.id)
                : [...selectedPets, pet.id]
              onSelectionChange(newSelection)
            }}
            style={{
              padding: '6px 12px',
              border: '2px solid',
              borderColor: selectedPets.includes(pet.id) ? '#4CAF50' : '#ddd',
              borderRadius: '20px',
              backgroundColor: selectedPets.includes(pet.id) ? '#e8f5e8' : 'white',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{selectedPets.includes(pet.id) ? '?' : ''}</span>
            <span>{pet.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function WalkControls({ user }) {
  const { active, paused, elapsed, distance, start, togglePause, finish, drop, petIds, setPetIds } = useWalk()
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [finishForm, setFinishForm] = useState({ notes: '', visibility: 'private' })

  // Check for user with multiple methods
  const isSignedIn = user || getToken()

  if (!isSignedIn) {
    return (
      <div className="walk-controls">
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: 12 }}>??</div>
          <div><strong>Please sign in to start tracking walks</strong></div>
          <div className="small" style={{ color: '#666', marginTop: 8 }}>
            Go to the Profile tab to sign in or create an account
          </div>
          <button 
            onClick={() => {
              // Try to navigate to profile tab
              const tabs = document.querySelectorAll('.tab')
              tabs.forEach(tab => {
                if (tab.textContent === 'Profile') {
                  tab.click()
                }
              })
            }}
            style={{
              marginTop: 12,
              padding: '12px 24px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px'
            }}
          >
            Go to Profile
          </button>
        </div>
      </div>
    )
  }

  const handleFinish = async () => {
    if (!active) return
    try {
      await finish(finishForm)
      setShowFinishModal(false)
      setFinishForm({ notes: '', visibility: 'private' })
    } catch (error) {
      alert('Failed to save walk: ' + error.message)
    }
  }

  return (
    <div className="walk-controls">
      {/* Stats Display */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4CAF50' }}>
              {fmtDist(distance)}
            </div>
            <div className="small">Distance</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2196F3' }}>
              {fmtDur(elapsed)}
            </div>
            <div className="small">Time</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FF9800' }}>
              {active ? (paused ? '??' : '??') : '??'}
            </div>
            <div className="small">Status</div>
          </div>
        </div>
      </div>

      {/* Dog Selection (only show when not walking) */}
      {!active && (
        <div className="card" style={{ marginBottom: 12 }}>
          <DogSelector 
            selectedPets={petIds} 
            onSelectionChange={setPetIds} 
            user={user} 
          />
        </div>
      )}

      {/* Main Controls */}
      <div className="card">
        {!active ? (
          <button 
            className="button" 
            onClick={start}
            disabled={petIds.length === 0}
            style={{ 
              width: '100%', 
              backgroundColor: petIds.length === 0 ? '#ccc' : '#4CAF50', 
              color: 'white',
              fontSize: '18px',
              padding: '16px'
            }}
          >
            ?? Start Walk {petIds.length === 0 && '(Select a dog first)'}
          </button>
        ) : (
          <div>
            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              <button 
                className="button" 
                onClick={togglePause}
                style={{ 
                  flex: 1,
                  backgroundColor: paused ? '#4CAF50' : '#FF9800',
                  color: 'white'
                }}
              >
                {paused ? '?? Resume' : '?? Pause'}
              </button>
              <button 
                className="button" 
                onClick={() => setShowFinishModal(true)}
                style={{ 
                  flex: 1,
                  backgroundColor: '#f44336',
                  color: 'white'
                }}
              >
                ?? Finish
              </button>
            </div>

            {/* Event Markers */}
            <div>
              <div className="small" style={{ marginBottom: 8, fontWeight: '500' }}>Mark Events:</div>
              <div className="row" style={{ gap: 8 }}>
                <button 
                  className="button" 
                  onClick={() => drop('poop')}
                  style={{ flex: 1, backgroundColor: '#8B4513', color: 'white' }}
                >
                  ?? Poop
                </button>
                <button 
                  className="button" 
                  onClick={() => drop('pee')}
                  style={{ flex: 1, backgroundColor: '#FFD700', color: '#333' }}
                >
                  ?? Pee
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Finish Walk Modal */}
      {showFinishModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 400 }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Finish Walk</h3>
            
            <label>Notes (optional)</label>
            <textarea
              value={finishForm.notes}
              onChange={(e) => setFinishForm({...finishForm, notes: e.target.value})}
              placeholder="How was the walk?"
              rows={3}
              style={{ width: '100%', marginBottom: 12, resize: 'vertical' }}
            />

            <label>Privacy</label>
            <select
              value={finishForm.visibility}
              onChange={(e) => setFinishForm({...finishForm, visibility: e.target.value})}
              style={{ width: '100%', marginBottom: 16 }}
            >
              <option value="private">Private</option>
              <option value="friends">Friends Only</option>
              <option value="groups">Share to Groups</option>
            </select>

            <div className="row" style={{ gap: 8 }}>
              <button 
                className="button" 
                onClick={() => setShowFinishModal(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className="button" 
                onClick={handleFinish}
                style={{ 
                  flex: 1, 
                  backgroundColor: '#4CAF50', 
                  color: 'white' 
                }}
              >
                Save Walk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function WalkTab({ me }) {
  const { route, events, active } = useWalk()
  const [mapCenter, setMapCenter] = useState([40.0, -74.0])
  const [userLocation, setUserLocation] = useState(null)

  // Get user's current location for map center
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setMapCenter([latitude, longitude])
          setUserLocation([latitude, longitude])
        },
        () => {
          console.log('Location access denied')
        },
        { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
      )
    }
  }, [])

  const pathStyle = { color: '#4CAF50', weight: 4 }
  const routePoints = route.map(p => [p.lat, p.lon])
  const eventMarkers = events.map((event, idx) => ({
    ...event,
    id: idx,
    position: [event.lat, event.lon]
  }))

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {/* Map */}
      <div style={{ height: 'calc(100% - 200px)' }}>
        <MapContainer 
          center={mapCenter} 
          zoom={16} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          
          {/* Current route */}
          {routePoints.length > 1 && (
            <Polyline positions={routePoints} pathOptions={pathStyle} />
          )}
          
          {/* Start marker (dog icon) */}
          {routePoints.length > 0 && (
            <Marker position={routePoints[0]} icon={dogIcon} />
          )}
          
          {/* Current location */}
          {userLocation && (
            <Marker position={userLocation} icon={currentLocationIcon} />
          )}
          
          {/* Event markers */}
          {eventMarkers.map(event => (
            <Marker
              key={event.id}
              position={event.position}
              icon={event.type === 'poop' ? poopIcon : peeIcon}
            />
          ))}
        </MapContainer>
      </div>

      {/* Controls Panel - Fixed at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '200px',
        backgroundColor: 'white',
        borderTop: '1px solid #ddd',
        overflow: 'auto',
        padding: 12
      }}>
        <WalkControls user={me} />
      </div>
    </div>
  )
}