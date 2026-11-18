import { PrismaClient } from "@prisma/client";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const db = new PrismaClient();
let shopId = "", otherId = "";
const start = new Date("2030-01-08T13:00:00.000Z"),end = new Date(start.getTime()+30*60000);
try{
 const first=await db.barbershop.create({data:{name:"Teste A",slug:"ci-"+randomUUID().slice(0,12),status:"ACTIVE",paidThrough:new Date("2035-01-01")}});
 shopId=first.id;
 const other=await db.barbershop.create({data:{name:"Teste B",slug:"ci-"+randomUUID().slice(0,12)}});
 otherId=other.id;
 const pro=await db.professional.create({data:{shopId,name:"Profissional",hours:{create:{weekday:2,startMinute:540,endMinute:1080}}}});
 const service=await db.service.create({data:{shopId,name:"Corte",priceCents:3500,durationMinutes:30}});
 assert.equal(await db.professional.findFirst({where:{id:pro.id,shopId:otherId}}),null,"isolamento por barbearia");
 async function reserve(){
  return db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT "id" FROM "Professional" WHERE "id" = ${pro.id} FOR UPDATE`;
   const overlap=await tx.appointment.findFirst({where:{shopId,professionalId:pro.id,status:{in:["CONFIRMED","COMPLETED"]},startAt:{lt:end},endAt:{gt:start}}});
   if(overlap)throw Error("ocupado");
   return tx.appointment.create({data:{shopId,professionalId:pro.id,serviceId:service.id,clientName:"Cliente",clientPhone:"71999999999",startAt:start,endAt:end,amountCents:3500}});
  });
 }
 const results=await Promise.allSettled([reserve(),reserve()]);
 assert.equal(results.filter(r=>r.status==="fulfilled").length,1,"apenas uma reserva simultânea");
 const booking=await db.appointment.findFirstOrThrow({where:{shopId}});
 await db.appointment.update({where:{id:booking.id},data:{status:"COMPLETED",paymentStatus:"PAID"}});
 const revenue=await db.appointment.aggregate({where:{shopId,status:"COMPLETED",paymentStatus:"PAID"},_sum:{amountCents:true}});
 assert.equal(revenue._sum.amountCents,3500,"receita registrada");
 const blocked=await db.blockedDate.create({data:{shopId,date:"2030-01-09",note:"Folga"}});
 assert.equal((await db.blockedDate.findFirst({where:{shopId,date:"2030-01-09"}}))?.id,blocked.id,"bloqueio salvo");
 console.log("SMOKE OK — isolamento, corrida de reservas, faturamento e folgas");
}catch(err){console.error(err);process.exitCode=1;}
finally{
 if(shopId){
  await db.appointment.deleteMany({where:{shopId}});
  await db.blockedDate.deleteMany({where:{shopId}});
  await db.professional.deleteMany({where:{shopId}});
  await db.service.deleteMany({where:{shopId}});
  await db.barbershop.delete({where:{id:shopId}});
 }
 if(otherId)await db.barbershop.delete({where:{id:otherId}});
 await db.$disconnect();
}
