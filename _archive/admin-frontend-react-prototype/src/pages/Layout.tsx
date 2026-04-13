import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken, isAuthed } from "../api";
import { useEffect } from "react";

const link = ({isActive}:{isActive:boolean}) => ({
  display:"block",padding:"10px 16px",borderRadius:6,marginBottom:4,
  color:isActive?"#fff":"#cbd5e1",background:isActive?"#3b82f6":"transparent",
  textDecoration:"none",fontSize:14,fontWeight:500,
});

export default function Layout() {
  const nav = useNavigate();
  useEffect(() => { if (!isAuthed()) nav("/login"); }, []);
  function logout() { clearToken(); nav("/login"); }
  return (
    <div style={{display:"flex",minHeight:"100vh",fontFamily:"system-ui",background:"#f1f5f9"}}>
      <aside style={{width:240,background:"#0f172a",color:"#fff",padding:20,display:"flex",flexDirection:"column"}}>
        <h2 style={{margin:"0 0 24px",fontSize:18}}>R3STO Admin</h2>
        <nav style={{flex:1}}>
          <NavLink to="/" end style={link}>Dashboard</NavLink>
          <NavLink to="/reservations" style={link}>Réservations</NavLink>
          <NavLink to="/menus" style={link}>Menus & Items</NavLink>
          <NavLink to="/paiements" style={link}>Paiements</NavLink>
          <NavLink to="/tables" style={link}>Tables & Salles</NavLink>
        </nav>
        <button onClick={logout} style={{padding:10,borderRadius:6,border:0,background:"#ef4444",color:"#fff",cursor:"pointer"}}>Déconnexion</button>
      </aside>
      <main style={{flex:1,padding:32,overflow:"auto"}}><Outlet/></main>
    </div>
  );
}
