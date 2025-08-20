import React, { useEffect, useState } from 'react'
import { useWalk } from '../walkContext.jsx'

function WeatherWidget() {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Get user's location for weather
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords
            // Using OpenWeatherMap free API (you'll need to get an API key)
            const API_KEY = import.meta.env.VITE_WEATHER_API_KEY || 'demo'
            const response = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=imperial`
            )
            
            if (response.ok) {
              const data = await response.json()
              setWeather(data)
            } else {
              // Fallback to mock data if API fails
              setWeather({
                name: 'Your Location',
                main: { temp: 72, feels_like: 75 },
                weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
                wind: { speed: 5 }
              })
            }
          } catch (err) {
            setError('Weather unavailable')
          } finally {
            setLoading(false)
          }
        },
        () => {
          setError('Location access denied')
          setLoading(false)
        }
      )
    } else {
      setError('Geolocation not supported')
      setLoading(false)
    }
  }, [])

  if (loading) return <div className="small">Loading weather...</div>
  if (error) return <div className="small" style={{color: '#666'}}>{error}</div>

  return (
    <div className="weather-widget">
      <div className="row" style={{ alignItems: 'center', gap: 8 }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {Math.round(weather.main.temp)}°F
          </div>
          <div className="small">{weather.weather[0].description}</div>
        </div>
        <div style={{ fontSize: '32px' }}>
          {getWeatherEmoji(weather.weather[0].main)}
        </div>
      </div>
      <div className="small" style={{ marginTop: 4, color: '#666' }}>
        Feels like {Math.round(weather.main.feels_like)}°F • Wind {Math.round(weather.wind.speed)} mph
      </div>
    </div>
  )
}

function getWeatherEmoji(condition) {
  const emojiMap = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Fog': '🌫️'
  }
  return emojiMap[condition] || '🌤️'
}

export function HomeTab({ me, goWalk }) {
  const { active, paused } = useWalk()
  const [recentWalks, setRecentWalks] = useState([])

  useEffect(() => {
    // Load recent walks for quick stats
    if (me) {
      // This would use your existing API
      // api.walks.list(5).then(walks => setRecentWalks(walks.slice(0, 3)))
    }
  }, [me])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (!me) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: 16 }}>🐕</div>
        <h2>Welcome to PupWalks!</h2>
        <p className="small" style={{ marginBottom: 24 }}>
          Track your dog walks, mark important spots, and share your adventures.
        </p>
        <div className="small" style={{ color: '#666' }}>
          Please sign in on the Profile tab to get started.
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Greeting */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, marginBottom: 8 }}>
          {getGreeting()}, {me.display_name || me.email.split('@')[0]}! 🐾
        </h2>
        <WeatherWidget />
      </div>

      {/* Walk Status */}
      {active ? (
        <div className="card" style={{ marginBottom: 16, backgroundColor: '#e8f5e8' }}>
          <div className="row" style={{ alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: '32px' }}>🚶‍♂️</div>
            <div>
              <div><strong>Walk in Progress</strong></div>
              <div className="small">
                {paused ? 'Paused' : 'Active'} • Tap Walk tab to continue
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div><strong>Ready for a walk?</strong></div>
              <div className="small">Perfect weather for your pups!</div>
            </div>
            <button className="button" onClick={goWalk} style={{ 
              backgroundColor: '#4CAF50', 
              color: 'white',
              fontSize: '16px',
              padding: '12px 24px'
            }}>
              Start Walk 🐕
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px 0' }}>This Week</h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>0</div>
            <div className="small">Walks</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>0.0</div>
            <div className="small">Miles</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>0h</div>
            <div className="small">Time</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 style={{ margin: '0 0 12px 0' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="button" style={{ flex: 1, minWidth: '120px' }} onClick={goWalk}>
            🚶‍♂️ New Walk
          </button>
          <button className="button" style={{ flex: 1, minWidth: '120px' }}>
            🐕 My Dogs
          </button>
          <button className="button" style={{ flex: 1, minWidth: '120px' }}>
            📱 Share
          </button>
        </div>
      </div>
    </div>
  )
}
