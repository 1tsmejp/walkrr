import React, { useState } from 'react'
import { api, setToken } from '../api.js'

export function ProfileTab({ me, setMe }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email:'', password:'', display_name:'' })

  async function submit(e){
    e.preventDefault()
    try{
      if (mode==='login') {
        const r = await api.login(form.email, form.password)
        setToken(r.token)
        setMe(r.user)
      } else {
        const r = await api.register(form.email, form.password, form.display_name)
        setToken(r.token)
        setMe(r.user)
      }
    }catch(e){ alert(e.message) }
  }

  function signout(){
    setToken(null)
    setMe(null)
  }

  return (
    <div style={{ padding: 12 }}>
      {!me ? (
        <div className="card">
          <div className="row" style={{ justifyContent:'space-between' }}>
            <b>{mode==='login' ? 'Sign In' : 'Create Account'}</b>
            <a style={{ cursor:'pointer' }} onClick={()=>setMode(mode==='login'?'signup':'login')}>
              {mode==='login' ? 'Need an account?' : 'Have an account?'}
            </a>
          </div>
          <form onSubmit={submit}>
            {mode==='signup' && (<>
              <label>Display Name</label>
              <input value={form.display_name} onChange={e=>setForm({...form, display_name:e.target.value})} />
            </>)}
            <label>Email</label>
            <input type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required />
            <label>Password</label>
            <input type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} required />
            <div style={{ marginTop: 8 }}><button className="button" type="submit">{mode==='login'?'Sign In':'Sign Up'}</button></div>
          </form>
        </div>
      ) : (
        <div className="card">
          <div><b>Signed in as</b></div>
          <div>{me.display_name || me.email}</div>
          <div style={{ marginTop: 8 }}><button className="button" onClick={signout}>Sign Out</button></div>
        </div>
      )}

      <div style={{ marginTop: 12 }} className="card">
        <b>Permissions</b>
        <div className="small">Enable Location in your browser for best results.</div>
      </div>
    </div>
  )
}
