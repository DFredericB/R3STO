import { useQuery } from "@tanstack/react-query";

export default function ListPage({title,queryKey,fetcher}:{title:string;queryKey:string;fetcher:()=>Promise<any>}) {
  const { data, isLoading, error } = useQuery({ queryKey:[queryKey], queryFn: fetcher });
  if (isLoading) return <div>Chargement…</div>;
  if (error) return <div style={{color:"#ef4444"}}>Erreur: {(error as Error).message}</div>;
  const rows: any[] = data?.data || data?.items || data?.rows || data?.[queryKey] || [];
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <div>
      <h1 style={{margin:"0 0 24px",fontSize:28,color:"#0f172a"}}>{title}</h1>
      <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.1)"}}>
        {rows.length===0 ? <div style={{padding:24,color:"#64748b"}}>Aucun élément.</div> : (
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
            <thead style={{background:"#f8fafc"}}>
              <tr>{cols.map(c=><th key={c} style={{textAlign:"left",padding:12,borderBottom:"1px solid #e2e8f0",color:"#475569"}}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #f1f5f9"}}>
                  {cols.map(c=><td key={c} style={{padding:12,color:"#0f172a"}}>{String(r[c]??"")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
