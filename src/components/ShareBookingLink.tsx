"use client";
import {useState} from "react";
import {Copy,Check,Share2} from "lucide-react";
export function ShareBookingLink({slug}:{slug:string}){
 const [copied,setCopied]=useState(false);
 async function copy(){
  const url=window.location.origin+"/b/"+encodeURIComponent(slug);
  try{await navigator.clipboard.writeText(url);setCopied(true);window.setTimeout(()=>setCopied(false),2500)}catch{
   window.prompt("Copie o link para compartilhar:",url);
  }
 }
 async function share(){
  const url=window.location.origin+"/b/"+encodeURIComponent(slug);
  if(navigator.share){try{await navigator.share({title:"Agende seu horário",text:"Meu link de agendamento",url});}catch{/* User dismissed native dialog */}}
  else await copy();
 }
 return <div className="share-booking-actions"><button type="button" onClick={copy} className="tiny-button" aria-live="polite">{copied?<Check size={15}/>:<Copy size={15}/>} {copied?"Link copiado":"Copiar link"}</button><button type="button" onClick={share} className="tiny-button secondary"><Share2 size={15}/> Compartilhar</button></div>;
}
