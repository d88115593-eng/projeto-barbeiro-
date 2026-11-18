"use server";
import { redirect } from "next/navigation";
import {fromZonedTime} from "date-fns-tz";
import {db} from "@/lib/db";
import {getAvailableSlots} from "@/lib/availability";
import {str,onlyDigits} from "@/lib/format";
export async function bookOnline(form:FormData) {
 const slug=str(form,"slug",40),serviceId=str(form,"serviceId",100),professionalId=str(form,"professionalId",100),date=str(form,"date",10),hour=str(form,"hour",5);
 const clientName=str(form,"clientName",80),clientPhone=onlyDigits(str(form,"clientPhone",25));
 const payment=str(form,"payment",10);
 const shop=await db.barbershop.findUnique({where:{slug}});
 if(!shop || !/^[a-zA-ZÀ-ÿ ]{2,80}$/.test(clientName) || clientPhone.length<10 || clientPhone.length>13)redirect("/b/"+slug+"?erro=dados");
 if(payment!=="PIX" && payment!=="AT_SHOP")redirect("/b/"+slug+"?erro=pagamento");
 if((payment==="PIX"&&!shop.pixEnabled) ||(payment==="AT_SHOP"&&!shop.payAtShopEnabled))redirect("/b/"+slug+"?erro=pagamento");
 const slots=await getAvailableSlots(shop.id,professionalId,serviceId,date);
 const slot=slots.find(s=>s.label===hour);
 if(!slot)redirect("/b/"+slug+"?erro=horario");
 const service=await db.service.findFirst({where:{id:serviceId,shopId:shop.id,active:true}});
 if(!service)redirect("/b/"+slug+"?erro=servico");
 // Lock the professional row so simultaneous requests cannot reserve overlapping time.
 let reference="";
 try{
  reference=await db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT "id" FROM "Professional" WHERE "id" = ${professionalId} FOR UPDATE`;
   const professional=await tx.professional.findFirst({where:{id:professionalId,shopId:shop.id,active:true}});
   if(!professional)throw new Error("Profissional indisponível");
   const holiday=await tx.blockedDate.findFirst({where:{shopId:shop.id,date,OR:[{professionalId:null},{professionalId}]}});
   if(holiday)throw new Error("Data bloqueada");
   if(professional.maxDailyBookings>0){
    const dayStart=fromZonedTime(date+"T00:00:00",shop.timezone);
    const tomorrow=new Date(Date.parse(date+"T00:00:00Z")+86400000).toISOString().slice(0,10);
    const dayEnd=fromZonedTime(tomorrow+"T00:00:00",shop.timezone);
    const count=await tx.appointment.count({where:{professionalId,shopId:shop.id,status:{in:["CONFIRMED","COMPLETED"]},startAt:{gte:dayStart,lt:dayEnd}}});
    if(count>=professional.maxDailyBookings)throw new Error("Limite diário atingido");
   }
   const busy=await tx.appointment.findFirst({where:{shopId:shop.id,professionalId,status:{in:["CONFIRMED","COMPLETED"]},startAt:{lt:slot.endAt},endAt:{gt:slot.startAt}}});
   if(busy)throw new Error("Horário ocupado");
   const booked=await tx.appointment.create({data:{shopId:shop.id,serviceId,professionalId,clientName,clientPhone,startAt:slot.startAt,endAt:slot.endAt,amountCents:service.priceCents,paymentMethod:payment as "PIX"|"AT_SHOP"}});
   return booked.reference;
  },{timeout:10000});
 }catch{redirect("/b/"+slug+"?erro=horario");}
 redirect("/b/"+slug+"/confirmacao/"+reference);
}
