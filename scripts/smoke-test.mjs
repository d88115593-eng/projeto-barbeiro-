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
 const user=await db.user.create({data:{username:"ci-"+randomUUID().slice(0,12),passwordHash:"test-only",role:"OWNER",shopId,fullName:"Responsavel Teste",email:"teste@example.com",phone:"71999999999"}});
 assert.equal(user.fullName,"Responsavel Teste","dados do responsável");
 await db.user.update({where:{id:user.id},data:{mustChangePassword:true}});
 assert.equal((await db.user.findUniqueOrThrow({where:{id:user.id}})).mustChangePassword,true,"recuperação de acesso master");
 await db.platformSettings.upsert({where:{id:"main"},create:{id:"main",supportMessage:"Teste"},update:{supportMessage:"Teste"}});
 assert.equal((await db.platformSettings.findUniqueOrThrow({where:{id:"main"}})).supportMessage,"Teste","suporte editável");
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
 await db.barbershop.update({where:{id:shopId},data:{depositMode:"REQUIRED",depositFixedCents:1000,depositDueMinutes:30,pixEnabled:true,pixKey:"ci-test",pixRecipientName:"Barbearia Teste"}});
 const startHold=new Date("2030-01-08T14:00:00.000Z"),endHold=new Date(startHold.getTime()+1800000);
 const pending=await db.appointment.create({data:{shopId,professionalId:pro.id,serviceId:service.id,clientName:"Sinal",clientPhone:"71999999999",startAt:startHold,endAt:endHold,amountCents:3500,status:"AWAITING_PAYMENT",paymentMethod:"PIX",depositStatus:"PENDING",depositAmountCents:1000,depositExpiresAt:new Date(Date.now()+1800000)}});
 assert.equal((await db.appointment.findFirst({where:{id:pending.id,shopId:otherId}})),null,"isolamento de sinal entre lojas");
 const activeHold={shopId,professionalId:pro.id,startAt:{lt:endHold},endAt:{gt:startHold},OR:[{status:{in:["CONFIRMED","COMPLETED"]}},{status:"AWAITING_PAYMENT",depositExpiresAt:{gt:new Date()}}]};
 assert.ok(await db.appointment.findFirst({where:activeHold}),"sinal pendente bloqueia horário");
 const paid=await db.appointment.update({where:{id:pending.id},data:{status:"CONFIRMED",depositStatus:"PAID",depositPaidAt:new Date()}});
 assert.equal(paid.depositStatus,"PAID","confirmação manual do sinal");
 assert.equal(paid.paymentStatus,"PENDING","sinal não marca o serviço inteiro como pago");
 await db.appointment.update({where:{id:pending.id},data:{status:"AWAITING_PAYMENT",depositStatus:"PENDING",depositPaidAt:null,depositExpiresAt:new Date(Date.now()-60000)}});
 const activeAfterExpiry=await db.appointment.findFirst({where:activeHold});
 assert.equal(activeAfterExpiry,null,"pré-reserva expirada deixa de bloquear a agenda");
 const blocked=await db.blockedDate.create({data:{shopId,date:"2030-01-09",note:"Folga"}});
 assert.equal((await db.blockedDate.findFirst({where:{shopId,date:"2030-01-09"}}))?.id,blocked.id,"bloqueio salvo");
 console.log("SMOKE OK — isolamento, reservas simultâneas, sinal, expiração, faturamento e folgas");
}catch(err){console.error(err);process.exitCode=1;}
finally{
 if(shopId){
  await db.appointment.deleteMany({where:{shopId}});
  await db.blockedDate.deleteMany({where:{shopId}});
  await db.professional.deleteMany({where:{shopId}});
  await db.service.deleteMany({where:{shopId}});
  await db.user.deleteMany({where:{shopId}});
  await db.barbershop.delete({where:{id:shopId}});
 }
 if(otherId)await db.barbershop.delete({where:{id:otherId}});
 await db.$disconnect();
}
