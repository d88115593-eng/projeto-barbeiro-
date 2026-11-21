"use client";
import {useEffect,useState} from "react";
import {useFormStatus} from "react-dom";
import {bookOnline} from "@/app/actions/booking";
import type {Professional,Service} from "@prisma/client";
function BookingSubmit({disabled}:{disabled:boolean}){
 const {pending}=useFormStatus();
 return <button type="submit" disabled={disabled||pending} className="button full booking-submit">{pending?"Registrando seu horário...":"Confirmar agendamento →"}</button>;
}
type Props={slug:string;timezone:string;professionals:Professional[];services:Service[];pixEnabled:boolean;payAtShopEnabled:boolean;depositMode:"DISABLED"|"OPTIONAL"|"REQUIRED";depositPricing:"FIXED"|"PERCENT";depositFixedCents:number;depositPercent:number;depositMessage:string;depositDueMinutes:number;depositDeducts:boolean};
export function BookingForm({slug,timezone,professionals,services,pixEnabled,payAtShopEnabled,depositMode,depositPricing,depositFixedCents,depositPercent,depositMessage,depositDueMinutes,depositDeducts}:Props){
 const [paymentSelection,setPaymentSelection]=useState(depositMode==="REQUIRED"?"PIX":payAtShopEnabled?"AT_SHOP":"PIX");
 const [depositChoice,setDepositChoice]=useState("NO");
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
 const selectedService=services.find(s=>s.id===serviceId),selectedProfessional=professionals.find(p=>p.id===professionalId);
 const depositCents=selectedService?Math.min(selectedService.priceCents,depositPricing==="FIXED"?depositFixedCents:Math.round(selectedService.priceCents*depositPercent/100)):0;
 const depositRequested=depositMode==="REQUIRED"||(depositMode==="OPTIONAL"&&paymentSelection==="PIX"&&depositChoice==="YES");
 const money=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n/100);
 return <form action={bookOnline} className="booking-form"><input type="hidden" name="slug" value={slug}/><input type="hidden" name="hour" value={hour}/><label className="booking-honeypot" aria-hidden="true">Website<input type="text" name="website" tabIndex={-1} autoComplete="off"/></label><div className="booking-steps"><span className="active">1. Seu corte</span><span className={date?"active":""}>2. Seu horário</span><span className={hour?"active":""}>3. Confirmar</span></div>
 {services.find(s=>s.id===serviceId)?.imageUrl&&<div className="booking-selected-service"><img src={services.find(s=>s.id===serviceId)?.imageUrl} alt={"Foto de "+services.find(s=>s.id===serviceId)?.name}/><div><small>CORTE SELECIONADO</small><strong>{services.find(s=>s.id===serviceId)?.name}</strong><span>Confira a foto e escolha seu horário abaixo.</span></div></div>}
 <div className="booking-step-label">01 <strong>Escolha seu serviço</strong></div><div className="two-cols"><label>Serviço<select name="serviceId" value={serviceId} onChange={e=>setServiceId(e.target.value)} required>{services.map(x=><option key={x.id} value={x.id}>{x.name} • R$ {(x.priceCents/100).toFixed(2)} ({x.durationMinutes}min)</option>)}</select></label><label>Profissional<select name="professionalId" value={professionalId} onChange={e=>setProfessionalId(e.target.value)} required>{professionals.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div>
 <div className="booking-step-label">02 <strong>Encontre seu horário</strong></div><label>Escolha o dia<input type="date" name="date" value={date} min={minDate} onChange={e=>setDate(e.target.value)} required/></label>
 <div className="slot-area"><strong>Horários disponíveis</strong>{loading?<p>Consultando agenda...</p>:date?(slots.length?<div className="slot-grid">{slots.map(t=><button type="button" onClick={()=>setHour(t)} className={"slot "+(hour===t?"selected":"")} key={t}>{t}</button>)}</div>:<p>Nenhum horário disponível para esta data.</p>):<p>Selecione uma data para visualizar os horários.</p>}</div>
 <div className="booking-step-label">03 <strong>Confirme seus dados</strong></div><div className="two-cols"><label>Seu nome<input name="clientName" placeholder="Nome e sobrenome" minLength={2} maxLength={80} required/></label><label>Seu WhatsApp<input name="clientPhone" type="tel" placeholder="(71) 99999-9999" minLength={10} required/></label></div>
 <label>Como deseja pagar?<select name="payment" value={paymentSelection} onChange={e=>setPaymentSelection(e.target.value)} required>{payAtShopEnabled&&depositMode!=="REQUIRED"&&<option value="AT_SHOP">Pagar na barbearia</option>}{pixEnabled&&<option value="PIX">{depositMode==="REQUIRED"?"Pix para garantir o horário":"Pix manual (instruções após reservar)"}</option>}</select></label>
 {depositMode==="OPTIONAL"&&paymentSelection==="PIX"&&<label>Deseja antecipar um sinal?<select name="depositChoice" value={depositChoice} onChange={e=>setDepositChoice(e.target.value)}><option value="NO">Não, pagar o valor do serviço pelo Pix</option><option value="YES">Sim, sinal de {money(depositCents)}</option></select></label>}
 {depositRequested&&<div className="notice"><strong>{depositMode==="REQUIRED"?"Sinal obrigatório":"Sinal opcional"}: {money(depositCents)}</strong><p>{depositMessage||"O sinal será abatido do atendimento."} {depositDeducts?"Restante na barbearia: "+money(Math.max(0,(selectedService?.priceCents||0)-depositCents)):"Valor do serviço à parte: "+money(selectedService?.priceCents||0)}.</p>{depositMode==="REQUIRED"&&<small>O horário fica pré-reservado por {depositDueMinutes} minutos e só é confirmado depois que a barbearia verificar o recebimento.</small>}</div>}
 <div className="booking-summary"><span>RESUMO DO AGENDAMENTO</span><strong>{selectedService?.name||"Escolha um serviço"} <b>{selectedService?new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(selectedService.priceCents/100):""}</b></strong><small>{selectedProfessional?.name||"Profissional"} · {date?date.split("-").reverse().join("/"):"Selecione a data"} · {hour||"Escolha o horário"} · {selectedService?.durationMinutes||30} min</small></div><BookingSubmit disabled={!hour||(!pixEnabled&&!payAtShopEnabled)}/>
 <p className="fineprint">{depositMode==="REQUIRED"?"A reserva só será confirmada quando o barbeiro conferir o pagamento do sinal no banco. Não basta enviar comprovante.":"A reserva é registrada ao confirmar."} O WhatsApp da barbearia será disponibilizado em seguida, caso configurado.</p>
 </form>
}
