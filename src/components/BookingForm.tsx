"use client";
import {useEffect,useState} from "react";
import {bookOnline} from "@/app/actions/booking";
import type {Professional,Service} from "@prisma/client";
type Props={slug:string;timezone:string;professionals:Professional[];services:Service[];pixEnabled:boolean;payAtShopEnabled:boolean};
export function BookingForm({slug,timezone,professionals,services,pixEnabled,payAtShopEnabled}:Props){
 const [professionalId,setProfessionalId]=useState(professionals[0]?.id??"");
 const [serviceId,setServiceId]=useState(services[0]?.id??"");
 useEffect(()=>{
  const selectFromLink=()=>{
   const requested=new URLSearchParams(window.location.search).get("servico");
   if(requested&&services.some(service=>service.id===requested))setServiceId(requested);
  };
  selectFromLink();
  window.addEventListener("popstate",selectFromLink);
  return()=>window.removeEventListener("popstate",selectFromLink);
 },[services]);
 const [date,setDate]=useState("");
 const [slots,setSlots]=useState<string[]>([]);
 const [hour,setHour]=useState("");
 const [loading,setLoading]=useState(false);
 useEffect(()=>{
  if(!date||!professionalId||!serviceId){setSlots([]);setHour("");return;}
  const controller=new AbortController();
  setLoading(true);setHour("");
  fetch(`/api/horarios?slug=${encodeURIComponent(slug)}&professionalId=${encodeURIComponent(professionalId)}&serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`,{signal:controller.signal})
  .then(r=>r.json()).then(data=>setSlots(data.slots||[])).catch(()=>setSlots([])).finally(()=>setLoading(false));
  return()=>controller.abort();
 },[date,professionalId,serviceId,slug]);
 const minDate=new Date().toLocaleDateString("en-CA",{timeZone:timezone});
 return <form action={bookOnline} className="booking-form"><input type="hidden" name="slug" value={slug}/><input type="hidden" name="hour" value={hour}/>
 {services.find(s=>s.id===serviceId)?.imageUrl&&<div className="booking-selected-service"><img src={services.find(s=>s.id===serviceId)?.imageUrl} alt={"Foto de "+services.find(s=>s.id===serviceId)?.name}/><div><small>CORTE SELECIONADO</small><strong>{services.find(s=>s.id===serviceId)?.name}</strong><span>Confira a foto e escolha seu horário abaixo.</span></div></div>}
 <div className="two-cols"><label>Serviço<select name="serviceId" value={serviceId} onChange={e=>setServiceId(e.target.value)} required>{services.map(x=><option key={x.id} value={x.id}>{x.name} • R$ {(x.priceCents/100).toFixed(2)} ({x.durationMinutes}min)</option>)}</select></label><label>Profissional<select name="professionalId" value={professionalId} onChange={e=>setProfessionalId(e.target.value)} required>{professionals.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div>
 <label>Escolha o dia<input type="date" name="date" value={date} min={minDate} onChange={e=>setDate(e.target.value)} required/></label>
 <div className="slot-area"><strong>Horários disponíveis</strong>{loading?<p>Consultando agenda...</p>:date?(slots.length?<div className="slot-grid">{slots.map(t=><button type="button" onClick={()=>setHour(t)} className={"slot "+(hour===t?"selected":"")} key={t}>{t}</button>)}</div>:<p>Nenhum horário disponível para esta data.</p>):<p>Selecione uma data para visualizar os horários.</p>}</div>
 <div className="two-cols"><label>Seu nome<input name="clientName" placeholder="Nome e sobrenome" minLength={2} maxLength={80} required/></label><label>Seu WhatsApp<input name="clientPhone" type="tel" placeholder="(71) 99999-9999" minLength={10} required/></label></div>
 <label>Como deseja pagar?<select name="payment" required>{payAtShopEnabled&&<option value="AT_SHOP">Pagar na barbearia</option>}{pixEnabled&&<option value="PIX">Pix manual (instruções após reservar)</option>}</select></label>
 <button type="submit" disabled={!hour||(!pixEnabled&&!payAtShopEnabled)} className="button full">Confirmar meu horário</button>
 <p className="fineprint">A reserva é registrada ao confirmar. O WhatsApp da barbearia será disponibilizado em seguida, caso configurado.</p>
 </form>
}
