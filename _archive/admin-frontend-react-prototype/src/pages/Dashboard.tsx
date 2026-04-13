import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

function Card({title,value,sub}:{title:string;value:string;sub?:string}) {
  return (
    <div style={{background:"#fff",padding:24,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.1)"}}>
      <div style={{fontSize:13,color:"#64748b",marginBottom:8}}>{title}</div>
      <div style={{fontSize:28,fontWeight:700,color:"#0f172a"}}>{value}</div>
      {sub && <div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey:["stats"], queryFn: api.stats });
  if (isLoading) return <div>Chargement…</div>;
  if (error) return <div style={{color:"#ef4444"}}>Erreur: {(error as Error).message}</div>;
  const s = data?.stats;
  return (
    <div>
      <h1 style={{margin:"0 0 24px",fontSize:28,color:"#0f172a"}}>Dashboard</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:32}}>
        <Card title="CA aujourd'hui" value={`${s.ca.jour} ${s.ca.devise}`} sub={`Semaine: ${s.ca.semaine} · Mois: ${s.ca.mois}`}/>
        <Card title="Réservations jour" value={String(s.reservations.jour)} sub={`${s.reservations.couverts_jour} couverts`}/>
        <Card title="Réservations semaine" value={String(s.reservations.semaine)} sub={`${s.reservations.couverts_semaine} couverts`}/>
        <Card title="Taux occupation" value={`${s.occupation.taux_pct}%`} sub={`${s.occupation.couverts_jour}/${s.occupation.capacite_totale}`}/>
      </div>
    </div>
  );
}
