import React, { useEffect, useState } from 'react'
import { api, absUrl } from '../api.js'

export function DogsTab({ me }) {
  const [pets, setPets] = useState([])
  const [form, setForm] = useState({ name:'', breed:'', photo_url:'' })
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(()=>{ 
    if (me) {
      api.pets.list().then(setPets).catch(console.error)
    }
  },[me])

  async function submit(e){
    e.preventDefault()
    if (!me) return alert('Sign in on Profile tab first')
    
    setUploading(true)
    try {
      let photo_url = form.photo_url
      
      // Upload file if selected
      if (file) {
        const uploadResult = await api.upload(file)
        photo_url = uploadResult.url
      }
      
      // Create pet
      const p = await api.pets.create({ 
        name: form.name, 
        breed: form.breed, 
        photo_url 
      })
      
      setPets([p, ...pets])
      setForm({ name:'', breed:'', photo_url:'' })
      setFile(null)
    } catch (error) {
      alert('Failed to add pet: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  async function deletePet(petId) {
    if (!confirm('Delete this pet?')) return
    try {
      await api.pets.delete(petId)
      setPets(pets.filter(p => p.id !== petId))
    } catch (error) {
      alert('Failed to delete pet: ' + error.message)
    }
  }

  return (
    <div style={{ padding: 12 }}>
      <div className="card" style={{ marginBottom: 12 }}>
        <b>Add Pet</b>
        <form onSubmit={submit}>
          <label>Name</label>
          <input 
            value={form.name} 
            onChange={e=>setForm({...form, name:e.target.value})} 
            required 
            placeholder="Dog's name"
          />
          
          <label>Breed (optional)</label>
          <input 
            value={form.breed} 
            onChange={e=>setForm({...form, breed:e.target.value})} 
            placeholder="e.g., Golden Retriever"
          />
          
          <label>Photo</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={e=>setFile(e.target.files?.[0] || null)} 
          />
          
          <div className="small" style={{marginTop:6}}>‚Ä¶or paste a URL</div>
          <input 
            placeholder="https://example.com/dog.jpg" 
            value={form.photo_url} 
            onChange={e=>setForm({...form, photo_url:e.target.value})} 
          />
          
          {(file || form.photo_url) && (
            <div className="row" style={{marginTop:8, gap:12}}>
              <img
                src={file ? URL.createObjectURL(file) : absUrl(form.photo_url)}
                alt="Pet preview" 
                style={{width:72,height:72,borderRadius:12,objectFit:'cover',border:'1px solid #ddd'}}
              />
              {uploading && <div className="small">Uploading‚Ä¶</div>}
            </div>
          )}
          
          <div style={{ marginTop:8 }}>
            <button className="button" type="submit" disabled={uploading}>
              {uploading ? 'Adding Pet‚Ä¶' : 'Add Pet'}
            </button>
          </div>
        </form>
      </div>

      {!me && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="small">Sign in on the Profile tab to manage your pets</div>
        </div>
      )}

      <div className="grid">
        {pets.map(p=>(
          <div className="card" key={p.id}>
            <div className="row" style={{ gap: 12 }}>
              <img 
                src={absUrl(p.photo_url) || 'https://via.placeholder.com/64x64?text=Ì†ΩÌ∞ï'} 
                alt={p.name}
                style={{ width: 64, height: 64, borderRadius: 12, objectFit:'cover' }} 
              />
              <div style={{ flex: 1 }}>
                <div><b>{p.name}</b></div>
                <div className="small">{p.breed || 'Mixed breed'}</div>
                <div className="small" style={{ color: '#666' }}>
                  Added {new Date(p.created_at).toLocaleDateString()}
                </div>
              </div>
              <button 
                onClick={() => deletePet(p.id)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#f44336', 
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
                title="Delete pet"
              >
                Ì†ΩÌ∑ëÔ∏è
              </button>
            </div>
          </div>
        ))}
      </div>

      {pets.length === 0 && me && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: 12 }}>Ì†ΩÌ∞ï</div>
          <div><b>No pets yet</b></div>
          <div className="small">Add your first pet above to start tracking walks!</div>
        </div>
      )}
    </div>
  )
}