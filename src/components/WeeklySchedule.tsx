"use client";
import {useState} from "react";
import {updateWeeklySchedule} from "@/app/actions/shop";
type Day={weekday:number;startMinute:number;endMinute:number;enabled:boolean};
const labels=["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
const toTime=(min:number)=>String(Math.floor(min/60)).padStart(2,"0")+":"+String(min%60).padStart(2,"0");
export function WeeklySchedule({professionalId,hours}:{professionalId:string;hours:Day[]}){
 const [days,setDays]=useState<Day[]>(()=>Array.from({length:7},(_,weekday)=>hours.find(h=>h.weekday===weekday)||{weekday,startMinute:540,endMinute:1080,enabled:false}));
 function patch(weekday:number,part:Partial<Day>){setDays(old=>old.map(d=>d.weekday===weekday?{...d,...part}:d));}
 const minutes=(v:string)=>{const [h,m]=v.split(":").map(Number);return h*60+m;};
 return <form action={updateWeeklySchedule} className="weekly-editor"><input type="hidden" name="professionalId" value={professionalId}/><div className="weekly-head"><strong>Dia</strong><strong>Atendimento</strong><strong>Abre</strong><strong>Fecha</strong></div>{days.map(d=><div className={"weekly-day "+(d.enabled?"is-open":"is-closed")} key={d.weekday}><strong>{labels[d.weekday]}</strong><label className="weekly-toggle"><input type="checkbox" name={"enabled_"+d.weekday} checked={d.enabled} onChange={e=>patch(d.weekday,{enabled:e.target.checked})}/><span>{d.enabled?"Aberto":"Fechado"}</span></label><input type="time" name={"start_"+d.weekday} value={toTime(d.startMinute)} onChange={e=>patch(d.weekday,{startMinute:minutes(e.target.value)})} aria-label={"Abertura "+labels[d.weekday]} disabled={!d.enabled}/><input type="time" name={"end_"+d.weekday} value={toTime(d.endMinute)} onChange={e=>patch(d.weekday,{endMinute:minutes(e.target.value)})} aria-label={"Fechamento "+labels[d.weekday]} disabled={!d.enabled}/>{!d.enabled&&<><input type="hidden" name={"start_"+d.weekday} value={toTime(d.startMinute)}/><input type="hidden" name={"end_"+d.weekday} value={toTime(d.endMinute)}/></>}</div>)}<button className="button button-sm" type="submit">Salvar horários da semana</button></form>;
}
