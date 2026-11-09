"use client";
import { useState } from "react";
import { FileText, Image as ImageIcon, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Section, Empty, Modal } from "./ui";

export default function Gallery({ data, onUpload, onDelete }: any) {
  const images = (data.documents || []).filter((d: any) => String(d.mime || "").startsWith("image/"));
  const [index, setIndex] = useState(-1);
  const preview = (d: any) => `/api/documents?id=${encodeURIComponent(d.id)}&preview=1`;
  const current = images[index];
  return <>
    <Section title="Gallery" subtitle={`${images.length} image${images.length === 1 ? "" : "s"}`} action={<button className="button primary" onClick={() => onUpload({})}><Plus size={15}/>Upload image or document</button>}>
      {data.documents?.length ? <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:14}}>
        {data.documents.map((d: any) => <article key={d.id} style={{border:"1px solid var(--line)",borderRadius:14,overflow:"hidden",background:"var(--surface)"}}>
          <button aria-label={`Preview ${d.name}`} onClick={() => String(d.mime || "").startsWith("image/") ? setIndex(images.findIndex((x: any) => x.id === d.id)) : window.open(preview(d), "_blank", "noopener,noreferrer")} style={{width:"100%",height:160,border:0,background:"var(--surface-2)",display:"grid",placeItems:"center",cursor:"pointer",padding:0}}>
            {String(d.mime || "").startsWith("image/") ? <img src={preview(d)} alt={d.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <FileText size={40}/>}
          </button>
          <div style={{padding:12,display:"flex",alignItems:"center",gap:8}}><span style={{flex:1,minWidth:0}}><strong style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</strong><small>{[d.organizationId && data.organizations?.find((o:any)=>o.id===d.organizationId)?.name,d.eventId && data.events?.find((e:any)=>e.id===d.eventId)?.name].filter(Boolean).join(" · ") || d.mime || "Document"}</small></span><button className="icon-button danger" aria-label={`Delete ${d.name}`} onClick={()=>onDelete("documents",d)}><Trash2 size={15}/></button></div>
        </article>)}
      </div> : <Empty title="No files yet" description="Upload event photos and organization documents to see them here." action={<button className="button" onClick={() => onUpload({})}><ImageIcon size={15}/>Upload a file</button>}/>}</Section>
    {current && <Modal title={current.name} wide onClose={() => setIndex(-1)}><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14}}><button className="icon-button" aria-label="Previous image" onClick={()=>setIndex((index-1+images.length)%images.length)}><ChevronLeft/></button><img src={preview(current)} alt={current.name} style={{maxWidth:"min(75vw,900px)",maxHeight:"70vh",objectFit:"contain"}}/><button className="icon-button" aria-label="Next image" onClick={()=>setIndex((index+1)%images.length)}><ChevronRight/></button></div><p className="notes-text" style={{textAlign:"center"}}>{index+1} of {images.length}</p></Modal>}
  </>;
}
