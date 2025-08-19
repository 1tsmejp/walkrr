import React, { useEffect, useState } from 'react'
import { api, absUrl } from '../api.js'
import { fmtDist, fmtDur } from '../utils.js'

export function FeedTab({ openDetail }) {
  const [walks, setWalks] = useState([])
  const [loading, setLoading] = useState(true)
  const [pubGroups, setPubGroups] = useState([])
  const [myGroups, setMyGroups] = useState([])
  const [filterGroup, setFilterGroup] = useState(null)

  // Create group form
  const [gForm, setGForm] = useState({ name:'', description:'', privacy:'public' })
  const [gBusy, setGBusy] = useState(false)

  // People & follow
  const [q, setQ] = useState('')
  const [people, setPeople] = useState([])
  const [rels, setRels] = useState({ followingIds:[], followerIds:[], mutualIds:[] })

  async function refreshGroups() {
    const [pub, mine] = await Promise.all([api.groups.listPublic(), api.groups.mine()])
    setPubGroups(pub); setMyGroups(mine)
  }
  async function refreshFeed(groupId=null) {
    setLoading(true)
    api.walks.list(25, groupId).then(setWalks).catch(()=>{}).finally(()=>setLoading(false))
  }
  async function refreshRelations() { api.users.whoami().then(setRels).catch(()=>{}) }

  useEffect(() => { refreshGroups().catch(()=>{}); refreshFeed(null); refreshRelations(); }, [])
  useEffect(() => { refreshFeed(filterGroup) }, [filterGroup])

  async function join(id){ await api.groups.join(id); await refreshGroups(); if (filterGroup===id) refreshFeed(id) }
  async function leave(id){ await api.groups.leave(id); await refreshGroups(); if (filterGroup===id) { setFilterGroup(null); refreshFeed(null) } }

  async function createGroup() {
    if (!gForm.name) return alert('Group name required')
    setGBusy(true)
    try {
      await api.groups.create(gForm)
      setGForm({ name:'', description:'', privacy:'public' })
      await refreshGroups()
      alert('Community created')
    } catch (e) { alert(e.message || 'Failed to create community') }
    finally { setGBusy(false) }
  }

  async function searchPeople() { api.users.search(q).then(setPeople).catch(()=>setPeople([])) }
  async function follow(uid){ await api.users.follow(uid); await refreshRelations(); await searchPeople() }
  async function unfollow(uid){ await api.users.unfollow(uid); await refreshRelations(); await searchPeople() }

  const isFollowing = id => rels.followingIds?.includes(id)
  const isMutual    = id => rels.mutualIds?.includes(id)

  return (
    <div className="home-hero">
      <div className="card">
        <b>Create Community</b>
        <label style={{ marginTop:8 }}>Name</label>
        <input value={gForm.name} onChange={e=>setGForm({...gForm, name:e.target.value})} />
        <label>Description</label>
        <textarea rows={2} value={gForm.description} onChange={e=>setGForm({...gForm, description:e.target.value})} />
        <label>Privacy</label>
        <div className="segmented">
          <button className={gForm.privacy==='public'?'active':''} onClick={()=>setGForm({...gForm, privacy:'public'})}>Public</button>
          <button className={gForm.privacy==='approval'?'active':''} onClick={()=>setGForm({...gForm, privacy:'approval'})}>Approval</button>
          <button className={gForm.privacy==='private'?'active':''} onClick={()=>setGForm({...gForm, privacy:'private'})}>Private</button>
        </div>
        <div className="small" style={{ marginTop:6 }}>
          Public: anyone can join. Approval: users request to join. Private: invite-only (hidden).
        </div>
        <div className="row" style={{ gap:8, marginTop:10 }}>
          <button className="button" disabled={gBusy} onClick={createGroup}>{gBusy?'Creating…':'Create'}</button>
        </div>
      </div>

      <div className="card">
        <b>Communities</b>
        <div className="grid" style={{ marginTop:10 }}>
          {pubGroups.map(g => {
            const mine = myGroups.find(m => m.id === g.id)
            return (
              <div key={g.id} className="card" style={{ padding:10 }}>
                <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
                  <b>{g.name}</b>
                  <span className="small">{g.members_count ?? 0} members</span>
                </div>
                <div className="small" style={{ marginTop:4 }}>{g.privacy || 'public'}</div>
                {g.description ? <div className="small" style={{ marginTop:6 }}>{g.description}</div> : null}
                <div className="row" style={{ gap:8, marginTop:8 }}>
                  {g.privacy === 'private' ? (
                    <button className="button" disabled>Private</button>
                  ) : mine ? (
                    <button className="button" onClick={()=>leave(g.id)}>Leave</button>
                  ) : (
                    <button className="button" onClick={()=>join(g.id)}>{g.privacy === 'approval' ? 'Request' : 'Join'}</button>
                  )}
                  <button className="button" onClick={()=>setFilterGroup(g.id)}>{filterGroup===g.id?'Viewing':'View'}</button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="row" style={{ gap:8, marginTop:8, alignItems:'center' }}>
          <b>Feed</b>
          <select value={filterGroup || ''} onChange={e => setFilterGroup(e.target.value ? Number(e.target.value) : null)}>
            <option value="">All</option>
            {myGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        {loading && <div className="small" style={{ marginTop: 8 }}>Loading…</div>}
        {!loading && walks.length === 0 && <div className="small" style={{ marginTop: 8 }}>No walks yet.</div>}
        {!loading && walks.length > 0 && (
          <div className="walk-list" style={{ marginTop: 10 }}>
            {walks.map(w => (
              <div className="walk-item clickable" key={w.id} onClick={()=>openDetail?.(w.id)}>
                <div className="walk-meta">
                  <div className="walk-title">
                    {(w.user?.display_name || w.user?.email || 'You')}
                    {w.group_shares?.length ? ` • ${w.group_shares.map(gs=>gs.group_name).join(', ')}` : ''}
                    {' • '}{new Date(w.started_at || w.created_at).toLocaleString()}
                  </div>
                  <div className="small">
                    {w.visibility || 'private'} • {fmtDist(w.distance_m)} • {fmtDur(w.duration_s)}{w.events?.length ? ` • ${w.events.length} events` : ''}
                  </div>
                  {w.notes ? <div className="small" style={{ marginTop:4 }}>“{w.notes}”</div> : null}
                </div>
                <div className="walk-pets">
                  {(w.pets || []).map(p => (<img key={p.id} src={absUrl(p.photo_url) || 'https://placehold.co/32x32'} title={p.name}/>))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <b>Find Walkers</b>
        <div className="row" style={{ gap:8, marginTop:8 }}>
          <input placeholder="Search by name or email…" value={q} onChange={e=>setQ(e.target.value)} />
          <button className="button" onClick={searchPeople}>Search</button>
        </div>
        <div className="grid" style={{ marginTop:10 }}>
          {people.map(u => (
            <div className="card" key={u.id} style={{ padding:10 }}>
              <div className="row" style={{ gap:8, alignItems:'center' }}>
                <img src={absUrl(u.photo_url) || 'https://placehold.co/40x40'} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', border:'1px solid var(--border)' }} />
                <div>
                  <div style={{ fontWeight:700 }}>{u.display_name || u.email}</div>
                  <div className="small">{isMutual(u.id) ? 'Mutual' : isFollowing(u.id) ? 'Following' : ''}</div>
                </div>
              </div>
              <div className="row" style={{ gap:8, marginTop:8 }}>
                {isFollowing(u.id)
                  ? <button className="button" onClick={()=>unfollow(u.id)}>Unfollow</button>
                  : <button className="button" onClick={()=>follow(u.id)}>Follow</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
