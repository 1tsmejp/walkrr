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

  useEffect(()=>{
    const t = getToken();
    if (t) api.me().then(setMe).catch(()=>setToken(null));
  },[]);

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
            <div key={t} className={"tab " + (active===t?'active':'')} onClick={()=>setActive(t)}>{t}</div>
          ))}
        </div>
      </div>
    </WalkProvider>
  )
}
