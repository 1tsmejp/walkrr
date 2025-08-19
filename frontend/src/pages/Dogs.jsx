import React, { useEffect, useState } from 'react'
import { api, absUrl } from '../api.js'

export function DogsTab({ me }) {
  const [pets, setPets] = useState([])
  const [form, setForm] = useState({ name:'', breed:'', photo_url:'' })
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(()=>{ if (me) api.pets.list().then(setPets).catch(()=>{}) },[me])

  async function submit(e){
    e.preventDefault()
    if (!me) return alert('Sign in on Profile tab first')
    let photo_url = form.photo_url
    if (file) {
      try {
        setUploading(true)
        const r = await api.upload(file)
        photo_url = /^https?:\/\//i.test(r.url) ? r.url : (import.meta.env.VITE_API_URL + r.url)
      } finally {
        setUploading(false)
      }
    }
    const p = await api.pets.create({ name: form.name, breed: form.breed, photo_url })
    setPets([p, ...pets])
    setForm({ name:'', breed:'', photo_url:'' })
    setFile(null)
  }

  return (
    <div style={{ padding: 12 }}>
      <div className="card" style={{ marginBottom: 12 }}>
        <b>Add Pet</b>
        <form onSubmit={submit}>
          <label>Name</label>
          <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
          <label>Breed</label>
          <input value={form.breed} onChange={e=>setForm({...form, breed:e.target.value})} />
          <label>Photo</label>
          <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0] || null)} />
          <div className="small" style={{marginTop:6}}>…or paste a URL</div>
          <input placeholder="https://…" value={form.photo_url} onChange={e=>setForm({...form, photo_url:e.target.value})} />
          {(file || form.photo_url) && (
            <div className="row" style={{marginTop:8, gap:12}}>
              <img
                src={file ? URL.createObjectURL(file) : absUrl(form.photo_url)}
                alt="" style={{width:72,height:72,borderRadius:12,objectFit:'cover',border:'1px solid var(--border)'}}
              />
              {uploading && <div className="small">Uploading…</div>}
            </div>
          )}
          <div style={{ marginTop:8 }}>
            <button className="button" type="submit" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Add Pet'}
            </button>
          </div>
        </form>
      </div>

      <div className="grid">
        {pets.map(p=>(
          <div className="card" key={p.id}>
            <div className="row" style={{ gap: 12 }}>
              <img src={absUrl(p.photo_url) || 'https://placehold.co/80x80'} alt=""
                   style={{ width: 64, height: 64, borderRadius: 12, objectFit:'cover' }} />
              <div>
                <div><b>{p.name}</b></div>
                <div className="small">{p.breed || '—'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
