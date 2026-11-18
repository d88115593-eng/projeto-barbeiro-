"use client";
import {useState} from "react";
export function UploadField({name,label,initial="",accept="image/*"}:{name:string;label:string;initial?:string;accept?:string}){
 const [url,setUrl]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function upload(file:File){
  setBusy(true);setMessage("Enviando arquivo...");
  try{
   const form=new FormData();form.append("file",file);
   const response=await fetch("/api/upload",{method:"POST",body:form});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Falha no envio");
   setUrl(result.url);setMessage("Arquivo enviado. Salve o formulário para publicar.");
  }catch(err){setMessage(err instanceof Error?err.message:"Erro ao enviar");}
  finally{setBusy(false);}
 }
 return <label className="upload-field">{label}<input name={name} value={url} onChange={e=>setUrl(e.target.value)} placeholder="URL pública ou envie um arquivo"/><input type="file" accept={accept} disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);}}/>{message&&<small>{message}</small>}{url&&<small className="helper">Arquivo configurado: {url.slice(0,72)}</small>}</label>;
}
