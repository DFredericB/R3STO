import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const r = await api.login(email, password);
      setToken(r.token || r.access_token);
      nav("/");
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#0f172a",color:"#fff",fontFamily:"system-ui"}}>
      <form onSubmit={submit} style={{background:"#1e293b",padding:32,borderRadius:12,width:360,boxShadow:"0 10px 30px rgba(0,0,0,.3)"}}>
        <h1 style={{margin:"0 0 4px",fontSize:24}}>R3STO Admin</h1>
        <p style={{margin:"0 0 24px",color:"#94a3b8",fontSize:14}}>Connexion à votre espace</p>
        <label style={{display:"block",fontSize:12,color:"#94a3b8",marginBottom:4}}>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required
          style={{width:"100%",padding:10,marginBottom:16,borderRadius:6,border:"1px solid #334155",background:"#0f172a",color:"#fff"}}/>
        <label style={{display:"block",fontSize:12,color:"#94a3b8",marginBottom:4}}>Mot de passe</label>
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required
          style={{width:"100%",padding:10,marginBottom:16,borderRadius:6,border:"1px solid #334155",background:"#0f172a",color:"#fff"}}/>
        {err && <div style={{color:"#f87171",fontSize:13,marginBottom:12}}>{err}</div>}
        <button disabled={loading} style={{width:"100%",padding:12,borderRadius:6,border:0,background:"#3b82f6",color:"#fff",fontWeight:600,cursor:"pointer"}}>
          {loading?"Connexion…":"Se connecter"}
        </button>
      </form>
    </div>
  );
}
