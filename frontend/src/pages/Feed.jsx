import React, { useEffect, useState } from 'react'
import { api, absUrl } from '../api.js'
import { fmtDist, fmtDur } from '../utils.js'

function WalkCard({ walk, onExpand }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const eventCounts = {
    poop: (walk.events || []).filter(e => e.type === 'poop').length,
    pee: (walk.events || []).filter(e => e.type === 'pee').length
  }

  return (
    <div className="card" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => onExpand(walk)}>
      {/* Header */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          {walk.user?.photo_url ? (
            <img 
              src={absUrl(walk.user.photo_url)} 
              alt=""
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ 
              width: 32, 
              height: 32, 
              borderRadius: '50%', 
              backgroundColor: '#4CAF50', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {(walk.user?.display_name || walk.user?.email || '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontWeight: '500' }}>
              {walk.user?.display_name || walk.user?.email?.split('@')[0] || 'Unknown'}
            </div>
            <div className="small">{formatDate(walk.created_at)}</div>
          </div>
        </div>
        <div className="small" style={{ color: '#666' }}>
          {walk.visibility === 'private' && '??'}
          {walk.visibility === 'friends' && '??'}
          {walk.visibility === 'groups' && '??'}
        </div>
      </div>

      {/* Walk Stats */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#4CAF50' }}>
            {fmtDist(walk.distance_m)}
          </div>
          <div className="small">Distance</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2196F3' }}>
            {fmtDur(walk.duration_s)}
          </div>
          <div className="small">Duration</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px' }}>
            ?? {eventCounts.poop}
          </div>
          <div className="small">Poops</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px' }}>
            ?? {eventCounts.pee}
          </div>
          <div className="small">Pees</div>
        </div>
      </div>

      {/* Dogs */}
      {walk.pets && walk.pets.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div className="small" style={{ marginBottom: 4, color: '#666' }}>Walked with:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {walk.pets.map(pet => (
              <div key={pet.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                backgroundColor: '#f5f5f5',
                borderRadius: '12px',
                fontSize: '14px'
              }}>
                {pet.photo_url && (
                  <img 
                    src={absUrl(pet.photo_url)} 
                    alt=""
                    style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}
                <span>{pet.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {walk.notes && (
        <div style={{ 
          marginBottom: 8, 
          padding: 8, 
          backgroundColor: '#f9f9f9', 
          borderRadius: 8,
          fontSize: '14px',
          fontStyle: 'italic'
        }}>
          "{walk.notes}"
        </div>
      )}

      {/* Groups */}
      {walk.group_shares && walk.group_shares.length > 0 && (
        <div>
          <div className="small" style={{ color: '#666' }}>
            Shared to: {walk.group_shares.map(g => g.group_name).join(', ')}
          </div>
        </div>
      )}
    </div>
  )
}

function WalkDetailModal({ walk, onClose }) {
  if (!walk) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 16,
      paddingTop: 32,
      overflow: 'auto'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 500, maxHeight: '80vh', overflow: 'auto' }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Walk Details</h3>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Date and Time */}
        <div style={{ marginBottom: 16 }}>
          <div><strong>Date:</strong> {new Date(walk.created_at).toLocaleDateString()}</div>
          <div><strong>Time:</strong> {new Date(walk.created_at).toLocaleTimeString()}</div>
        </div>

        {/* Stats Grid */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
              {fmtDist(walk.distance_m)}
            </div>
            <div className="small">Total Distance</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>
              {fmtDur(walk.duration_s)}
            </div>
            <div className="small">Duration</div>
          </div>
        </div>

        {/* Event Summary */}
        {walk.events && walk.events.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Events</h4>
            <div className="row" style={{ gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px' }}>??</div>
                <div>{walk.events.filter(e => e.type === 'poop').length}</div>
                <div className="small">Poops</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px' }}>??</div>
                <div>{walk.events.filter(e => e.type === 'pee').length}</div>
                <div className="small">Pees</div>
              </div>
            </div>
          </div>
        )}

        {/* Dogs */}
        {walk.pets && walk.pets.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Dogs on this walk</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {walk.pets.map(pet => (
                <div key={pet.id} className="row" style={{
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '16px'
                }}>
                  {pet.photo_url ? (
                    <img 
                      src={absUrl(pet.photo_url)} 
                      alt=""
                      style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ fontSize: '20px' }}>??</div>
                  )}
                  <span>{pet.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {walk.notes && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Notes</h4>
            <div style={{ 
              padding: 12, 
              backgroundColor: '#f9f9f9', 
              borderRadius: 8,
              fontStyle: 'italic'
            }}>
              "{walk.notes}"
            </div>
          </div>
        )}

        {/* Route Info */}
        {walk.route && walk.route.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Route</h4>
            <div className="small" style={{ color: '#666' }}>
              {walk.route.length} GPS points recorded
            </div>
            {walk.route.length > 1 && (
              <div className="small" style={{ color: '#666' }}>
                Average speed: {((walk.distance_m / 1609.344) / (walk.duration_s / 3600)).toFixed(1)} mph
              </div>
            )}
          </div>
        )}

        {/* Groups Shared To */}
        {walk.group_shares && walk.group_shares.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 8px 0' }}>Shared with</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {walk.group_shares.map((share, idx) => (
                <div key={idx} style={{
                  padding: '4px 8px',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '12px',
                  fontSize: '14px'
                }}>
                  ?? {share.group_name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function FeedTab({ me }) {
  const [walks, setWalks] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedWalk, setSelectedWalk] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'mine', 'friends'

  const loadWalks = async () => {
    if (!me) return
    setLoading(true)
    try {
      const walkData = await api.walks.list(20)
      setWalks(walkData)
    } catch (error) {
      console.error('Failed to load walks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWalks()
  }, [me])

  const filteredWalks = walks.filter(walk => {
    if (filter === 'mine') return walk.user?.id === me?.id
    if (filter === 'friends') return walk.visibility === 'friends' && walk.user?.id !== me?.id
    return true
  })

  if (!me) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: 16 }}>??</div>
        <h3>Welcome to the Feed!</h3>
        <p className="small" style={{ marginBottom: 24, color: '#666' }}>
          See your walk history and discover walks from friends and groups.
        </p>
        <div className="small" style={{ color: '#666' }}>
          Please sign in on the Profile tab to view your feed.
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #ddd', 
        backgroundColor: 'white',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Walk Feed</h2>
          <button 
            onClick={loadWalks}
            disabled={loading}
            style={{
              padding: '6px 12px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '?' : '?'}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          {[
            { key: 'all', label: '?? All', count: walks.length },
            { key: 'mine', label: '????? Mine', count: walks.filter(w => w.user?.id === me?.id).length },
            { key: 'friends', label: '?? Friends', count: walks.filter(w => w.visibility === 'friends' && w.user?.id !== me?.id).length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: '8px 12px',
                border: '2px solid',
                borderColor: filter === tab.key ? '#4CAF50' : '#ddd',
                borderRadius: '20px',
                backgroundColor: filter === tab.key ? '#e8f5e8' : 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: filter === tab.key ? 'bold' : 'normal'
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: 16 
      }}>
        {loading && walks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div>Loading walks...</div>
          </div>
        ) : filteredWalks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '48px', marginBottom: 16 }}>??</div>
            <h3>No walks yet</h3>
            <p className="small" style={{ color: '#666' }}>
              {filter === 'mine' 
                ? "Start your first walk in the Walk tab!" 
                : "No walks found for this filter. Try a different filter or start walking!"}
            </p>
          </div>
        ) : (
          <div>
            {filteredWalks.map(walk => (
              <WalkCard 
                key={walk.id} 
                walk={walk} 
                onExpand={setSelectedWalk}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <WalkDetailModal 
        walk={selectedWalk} 
        onClose={() => setSelectedWalk(null)} 
      />
    </div>
  )
}