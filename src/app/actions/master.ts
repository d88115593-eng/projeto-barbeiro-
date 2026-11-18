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
  db.user.update({where:{id:owner.id},data:{passwordHash,mustChangePassword:true}}),
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

export async function createShopFromMaster(form:FormData){
 const actor=await requireMaster();
 const name=str(form,"name",80).trim(),slug=str(form,"slug",40).toLowerCase().trim();
 const fullName=str(form,"fullName",120).trim(),email=str(form,"email",160).toLowerCase().trim();
 const phone=str(form,"phone",25).replace(/\D/g,""),username=str(form,"username",40).toLowerCase().trim(),password=str(form,"password",200);
 const {redirect}=await import("next/navigation");
 if(name.length<3||fullName.length<5||!/^[a-z0-9-]{3,40}$/.test(slug)||!/^[a-z0-9_.-]{4,40}$/.test(username)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||phone.length<10||phone.length>13||password.length<12)redirect("/master?erro=dados#novo-cliente");
 const [existingUser,existingShop]=await Promise.all([db.user.findUnique({where:{username}}),db.barbershop.findUnique({where:{slug}})]);
 if(existingUser||existingShop)redirect("/master?erro=existente#novo-cliente");
 const passwordHash=await bcrypt.hash(password,12);
 const shop=await db.barbershop.create({data:{name,slug,status:"PENDING",heroTitle:"Bem-vindo à "+name,heroSubtitle:"Agende seu horário online em poucos passos.",users:{create:{username,fullName,email,phone,passwordHash,role:"OWNER",mustChangePassword:true}},audits:{create:{actorId:actor.id,event:"BARBEARIA_CRIADA_PELO_MASTER"}}}});
 revalidatePath("/master");
 redirect("/master/barbearias/"+shop.id+"?criada=1");
}
export async function updateShopFromMaster(form:FormData){
 const actor=await requireMaster(),shopId=str(form,"shopId",100);
 const name=str(form,"name",80),fullName=str(form,"fullName",120),email=str(form,"email",160).toLowerCase(),phone=str(form,"phone",25).replace(/\D/g,"");
 const whatsapp=str(form,"whatsapp",25).replace(/\D/g,""),address=str(form,"address",300);
 if(name.length<3||fullName.length<5||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||phone.length<10||phone.length>13)return;
 const shop=await db.barbershop.findUnique({where:{id:shopId},include:{users:{where:{role:"OWNER"},take:1}}});
 if(!shop||!shop.users[0])return;
 await db.$transaction([db.barbershop.update({where:{id:shopId},data:{name,whatsapp,address}}),db.user.update({where:{id:shop.users[0].id},data:{fullName,email,phone}}),db.auditLog.create({data:{actorId:actor.id,shopId,event:"DADOS_EDITADOS_PELO_MASTER"}})]);
 revalidatePath("/master");revalidatePath("/master/barbearias/"+shopId);revalidatePath("/b/"+shop.slug);
}
