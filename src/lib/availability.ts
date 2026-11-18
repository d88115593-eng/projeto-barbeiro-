import { fromZonedTime } from "date-fns-tz";
import { db } from "@/lib/db";
const dateRE=/^\d{4}-\d{2}-\d{2}$/;
export type Slot={label:string; startAt:Date; endAt:Date};
export async function getAvailableSlots(shopId:string, professionalId:string,serviceId:string,date:string):Promise<Slot[]> {
 if(!dateRE.test(date)) return [];
 const day=new Date(date+"T00:00:00.000Z");
 if(Number.isNaN(day.valueOf()) || day.toISOString().slice(0,10)!==date) return [];
 const [shop,professional,service]=await Promise.all([
  db.barbershop.findUnique({where:{id:shopId}}),
  db.professional.findFirst({where:{id:professionalId,shopId,active:true},include:{hours:true}}),
  db.service.findFirst({where:{id:serviceId,shopId,active:true}})
 ]);
 if(!shop || shop.status!=="ACTIVE" || !shop.paidThrough || shop.paidThrough<new Date() || !professional || !service) return [];
 const isBlocked=await db.blockedDate.findFirst({where:{shopId,date,OR:[{professionalId:null},{professionalId}]},select:{id:true}});
 if(isBlocked)return [];
 const hours=professional.hours.find(h=>h.weekday===day.getUTCDay() && h.enabled);
 if(!hours || hours.endMinute-hours.startMinute < service.durationMinutes) return [];
 const start=fromZonedTime(date+"T00:00:00",shop.timezone);
 const end=new Date(start.getTime()+1000*60*60*48);
 const occupied=await db.appointment.findMany({where:{professionalId,shopId,status:{in:["CONFIRMED","COMPLETED"]},startAt:{lt:end},endAt:{gt:start}},select:{startAt:true,endAt:true}});
 const slots:Slot[]=[];
 const nextDay=new Date(day.getTime()+86400000).toISOString().slice(0,10);
 const nextStart=fromZonedTime(nextDay+"T00:00:00",shop.timezone);
 const activeCount=occupied.filter(b=>b.startAt>=start&&b.startAt<nextStart).length;
 if(professional.maxDailyBookings>0&&activeCount>=professional.maxDailyBookings)return [];
 for(let min=hours.startMinute;min+service.durationMinutes<=hours.endMinute;min+=professional.slotIntervalMinutes){
  const label=`${String(Math.floor(min/60)).padStart(2,"0")}:${String(min%60).padStart(2,"0")}`;
  const st=fromZonedTime(`${date}T${label}:00`,shop.timezone);
  const en=new Date(st.getTime()+service.durationMinutes*60000);
  if(st.getTime()<Date.now()+20*60000) continue;
  if(occupied.some(b=>b.startAt<en && b.endAt>st)) continue;
  slots.push({label,startAt:st,endAt:en});
 }
 return slots;
}
