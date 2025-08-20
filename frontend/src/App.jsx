import React, { useEffect, useState } from 'react'
import { MapTab } from './pages/Map.jsx'
import { WalkTab } from './pages/Walk.jsx'
import { DogsTab } from './pages/Dogs.jsx'
import { FeedTab } from './pages/Feed.jsx'
import { ProfileTab } from './pages/Profile.jsx'
import { HomeTab } from './pages/Home.jsx'
import { api, getToken, setToken } from './api.js'
import { WalkProvider } from './walkContext.jsx'

export default function App() {
  const [active, setActive] = useState('Home');
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        const token = getToken();
        if (token) {
          const user = await api.me();
          setMe(user);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setToken(null); // Clear invalid token
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  // Show loading screen while initializing
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        background: '#4CAF50',
        color: 'white'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>??</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>PupWalks</div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Show error screen if something went wrong
  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        background: '#f44336',
        color: 'white',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>??</div>
        <div style={{ fontSize: '18px', marginBottom: '8px' }}>Something went wrong</div>
        <div style={{ fontSize: '14px', opacity: 0.8 }}>{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            marginTop: '16px',
            padding: '12px 24px',
            background: 'white',
            color: '#f44336',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          Reload App
        </button>
      </div>
    );
  }

  const tabs = ['Home','Walk','Dogs','Feed','Map','Profile'];

  return (
    <WalkProvider>
      <div className="app">
        <div className="header">
          <div><b>PupWalks</b></div>
          <div className="small">{me ? `Hi, ${me.display_name || me.email}` : 'Not signed in'}</div>
        </div>
        <div className="content">
          {active==='Home' && <HomeTab me={me} goWalk={()=>setActive('Walk')} />}
          {active==='Walk' && <WalkTab me={me} />}
          {active==='Dogs' && <DogsTab me={me} />}
          {active==='Feed' && <FeedTab me={me} />}
          {active==='Map' && <MapTab me={me} />}
          {active==='Profile' && <ProfileTab me={me} setMe={setMe} />}
        </div>
        <div className="bottom-tabs">
          {tabs.map(t=>(
            <div 
              key={t} 
              className={"tab " + (active===t?'active':'')} 
              onClick={()=>setActive(t)}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    </WalkProvider>
  )
}