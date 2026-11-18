"use server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import {requireMaster} from "@/lib/auth";
import {db} from "@/lib/db";
import {str} from "@/lib/format";
export async function activateShop(form:FormData){
 const actor=await requireMaster(),id=str(form,"shopId",100);
 const days=Number(str(form,"days",3));
 if(![30,90,180].includes(days))return;
 const shop=await db.barbershop.findUnique({where:{id}});
 if(!shop)return;
 const base=shop.paidThrough&&shop.paidThrough>new Date()?shop.paidThrough:new Date();
 const paidThrough=new Date(base.getTime()+days*86400000);
 await db.$transaction([
  db.barbershop.update({where:{id},data:{status:"ACTIVE",planDays:days,paidThrough}}),
  db.auditLog.create({data:{actorId:actor.id,shopId:id,event:`ASSINATURA_ATIVADA_${days}D`}})
 ]);
 revalidatePath("/master");
}
export async function suspendShop(form:FormData){
 const actor=await requireMaster(),id=str(form,"shopId",100);
 await db.$transaction([
  db.barbershop.update({where:{id},data:{status:"SUSPENDED"}}),
  db.auditLog.create({data:{actorId:actor.id,shopId:id,event:"ASSINATURA_SUSPENSA"}})
 ]);
 revalidatePath("/master");
}
export async function resetOwnerPassword(form:FormData){
 const actor=await requireMaster(),shopId=str(form,"shopId",100),password=str(form,"password",200);
 if(password.length<12)return;
 const owner=await db.user.findFirst({where:{shopId,role:"OWNER"}});
 if(!owner)return;
 const passwordHash=await bcrypt.hash(password,12);
 await db.$transaction([
  db.user.update({where:{id:owner.id},data:{passwordHash}}),
  db.session.deleteMany({where:{userId:owner.id}}),
  db.auditLog.create({data:{actorId:actor.id,shopId,event:"SENHA_REDEFINIDA"}})
 ]);
 revalidatePath("/master");
}

export async function updatePlatformSupport(form:FormData){
 const actor=await requireMaster();
 const supportWhatsapp=str(form,"supportWhatsapp",22).replace(/\D/g,"");
 const supportEmail=str(form,"supportEmail",160);
 const supportMessage=str(form,"supportMessage",400);
 if(supportWhatsapp && !/^\d{10,15}$/.test(supportWhatsapp))return;
 if(supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail))return;
 await db.$transaction([
  db.platformSettings.upsert({where:{id:"main"},create:{id:"main",supportWhatsapp,supportEmail,supportMessage},update:{supportWhatsapp,supportEmail,supportMessage}}),
  db.auditLog.create({data:{actorId:actor.id,event:"SUPORTE_ATUALIZADO"}})
 ]);
 revalidatePath("/master");revalidatePath("/admin");revalidatePath("/");
}
