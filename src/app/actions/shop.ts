"use server";
import { revalidatePath } from "next/cache";
import {db} from "@/lib/db";
import {requireActiveOwner} from "@/lib/auth";
import {moneyInput,str,urlOrBlank} from "@/lib/format";
export async function updateSite(form:FormData) {
 const {shop}=await requireActiveOwner();
 const name=str(form,"name",80),description=str(form,"description",2000),whatsapp=str(form,"whatsapp",20);
 const color=str(form,"accentColor",7);
 if(name.length<3)return;
 await db.barbershop.update({where:{id:shop.id},data:{
  name,description,whatsapp,address:str(form,"address",300),instagram:str(form,"instagram",120),
  heroTitle:str(form,"heroTitle",140)||"Seu estilo começa aqui.",heroSubtitle:str(form,"heroSubtitle",400),
  showServices:form.get("showServices")==="on",showTeam:form.get("showTeam")==="on",
  showGallery:form.get("showGallery")==="on",showReviews:form.get("showReviews")==="on",
  timezone:["America/Bahia","America/Sao_Paulo","America/Belem","America/Manaus","America/Cuiaba","America/Porto_Velho","America/Rio_Branco"].includes(str(form,"timezone",40))?str(form,"timezone",40):"America/Bahia",
  logoUrl:urlOrBlank(str(form,"logoUrl",800)),coverUrl:urlOrBlank(str(form,"coverUrl",800)),
  logoStyle:["CARD","ROUND","MINIMAL"].includes(str(form,"logoStyle",12))?str(form,"logoStyle",12):"CARD",
  accentColor:/^#[0-9a-f]{6}$/i.test(color)?color:"#2563FF",
  pixKey:str(form,"pixKey",180),pixRecipientName:str(form,"pixRecipientName",80),pixEnabled:form.get("pixEnabled")==="on" && !!str(form,"pixKey",180) && !!str(form,"pixRecipientName",80),
  payAtShopEnabled:form.get("payAtShopEnabled")==="on",
 }});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function createService(form:FormData){
 const {shop}=await requireActiveOwner();
 const name=str(form,"name",75),duration=Number(str(form,"durationMinutes",4)),description=str(form,"description",300);
 if(name.length<2 || !Number.isInteger(duration) || duration<15 || duration>360)return;
 const priceCents=moneyInput(form,"price");
 await db.service.create({data:{shopId:shop.id,name,description,durationMinutes:duration,priceCents}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function toggleService(form:FormData){
 const {shop}=await requireActiveOwner(),id=str(form,"id",100);
 const service=await db.service.findFirst({where:{id,shopId:shop.id}});if(!service)return;
 await db.service.update({where:{id},data:{active:!service.active}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function createProfessional(form:FormData){
 const {shop}=await requireActiveOwner();
 const name=str(form,"name",80),commissionPct=Number(str(form,"commissionPct",3));
 if(name.length<2 || !Number.isInteger(commissionPct) || commissionPct<0 || commissionPct>100)return;
 const hours=[1,2,3,4,5,6].map(weekday=>({weekday,startMinute:540,endMinute:1080}));
 await db.professional.create({data:{shopId:shop.id,name,commissionPct,photoUrl:urlOrBlank(str(form,"photoUrl",800)),hours:{create:hours}}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function toggleProfessional(form:FormData){
 const {shop}=await requireActiveOwner(),id=str(form,"id",100);
 const pro=await db.professional.findFirst({where:{id,shopId:shop.id}});if(!pro)return;
 await db.professional.update({where:{id},data:{active:!pro.active}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
const toMinute=(value:string)=>{
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return -1;
 const [h,m]=value.split(":").map(Number);return h*60+m;
};
export async function updateSchedule(form:FormData){
 const {shop}=await requireActiveOwner(),professionalId=str(form,"professionalId",100),weekday=Number(str(form,"weekday",2));
 const startMinute=toMinute(str(form,"start")),endMinute=toMinute(str(form,"end"));
 if(!Number.isInteger(weekday)||weekday<0||weekday>6||startMinute<0||endMinute<=startMinute||endMinute>1440)return;
 const pro=await db.professional.findFirst({where:{id:professionalId,shopId:shop.id}});
 if(!pro)return;
 await db.workingHour.upsert({where:{professionalId_weekday:{professionalId,weekday}},create:{professionalId,weekday,startMinute,endMinute,enabled:form.get("enabled")==="on"},update:{startMinute,endMinute,enabled:form.get("enabled")==="on"}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function registerWalkIn(form:FormData){
 const {shop}=await requireActiveOwner(),professionalId=str(form,"professionalId",100),serviceId=str(form,"serviceId",100);
 const [pro,service]=await Promise.all([db.professional.findFirst({where:{id:professionalId,shopId:shop.id}}),db.service.findFirst({where:{id:serviceId,shopId:shop.id}})]);
 if(!pro||!service)return;
 const clientName=str(form,"clientName",80)||"Cliente avulso",clientPhone=str(form,"clientPhone",25);
 const startAt=new Date(),endAt=new Date(startAt.getTime()+service.durationMinutes*60000);
 await db.appointment.create({data:{shopId:shop.id,professionalId,serviceId,clientName,clientPhone,startAt,endAt,amountCents:service.priceCents,source:"WALK_IN",status:"COMPLETED",paymentStatus:form.get("paid")==="on"?"PAID":"PENDING",paymentMethod:"AT_SHOP"}});
 revalidatePath("/admin");
}
export async function updateBooking(form:FormData){
 const {shop}=await requireActiveOwner(),id=str(form,"id",100),operation=str(form,"operation",20);
 const found=await db.appointment.findFirst({where:{id,shopId:shop.id}});if(!found)return;
 if(operation==="complete")await db.appointment.update({where:{id},data:{status:"COMPLETED"}});
 if(operation==="paid")await db.appointment.update({where:{id},data:{paymentStatus:"PAID"}});
 if(operation==="cancel" && found.status==="CONFIRMED")await db.appointment.update({where:{id},data:{status:"CANCELLED"}});
 if(operation==="no_show" && found.status==="CONFIRMED")await db.appointment.update({where:{id},data:{status:"NO_SHOW"}});
 revalidatePath("/admin");
}
export async function addExpense(form:FormData){
 const {shop}=await requireActiveOwner(),description=str(form,"description",180);
 if(description.length<2)return;
 const amountCents=moneyInput(form,"amount");
 await db.expense.create({data:{shopId:shop.id,description,amountCents}});
 revalidatePath("/admin");
}
export async function addReview(form:FormData){
 const {shop}=await requireActiveOwner(),clientName=str(form,"clientName",80),message=str(form,"message",500),rating=Number(str(form,"rating",1));
 if(clientName.length<2||message.length<5||!Number.isInteger(rating)||rating<1||rating>5)return;
 await db.review.create({data:{shopId:shop.id,clientName,message,rating,photoUrl:urlOrBlank(str(form,"photoUrl",800)),approved:true}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function addMedia(form:FormData){
 const {shop}=await requireActiveOwner(),url=urlOrBlank(str(form,"url",900)),caption=str(form,"caption",180),type=str(form,"type",10);
 if(!url||!["IMAGE","VIDEO"].includes(type))return;
 await db.media.create({data:{shopId:shop.id,url,caption,type}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function removeMedia(form:FormData){
 const {shop}=await requireActiveOwner(),id=str(form,"id",100);
 await db.media.deleteMany({where:{id,shopId:shop.id}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}

export async function updateProfessional(form:FormData){
 const {shop}=await requireActiveOwner(),id=str(form,"id",100),name=str(form,"name",80),commissionPct=Number(str(form,"commissionPct",3));
 if(name.length<2||!Number.isInteger(commissionPct)||commissionPct<0||commissionPct>100)return;
 await db.professional.updateMany({where:{id,shopId:shop.id},data:{name,commissionPct,photoUrl:urlOrBlank(str(form,"photoUrl",800))}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function updateService(form:FormData){
 const {shop}=await requireActiveOwner(),id=str(form,"id",100),name=str(form,"name",80),duration=Number(str(form,"durationMinutes",4));
 if(name.length<2||!Number.isInteger(duration)||duration<15||duration>360)return;
 const priceCents=moneyInput(form,"price");
 await db.service.updateMany({where:{id,shopId:shop.id},data:{name,priceCents,durationMinutes:duration,description:str(form,"description",300)}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function addBlockedDate(form:FormData){
 const {shop}=await requireActiveOwner(),date=str(form,"date",10),raw=str(form,"professionalId",100);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+"T00:00:00Z")))return;
 const professionalId=raw==="ALL"?null:raw;
 if(professionalId && !await db.professional.findFirst({where:{id:professionalId,shopId:shop.id}}))return;
 await db.blockedDate.create({data:{shopId:shop.id,date,professionalId,note:str(form,"note",120)}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function removeBlockedDate(form:FormData){
 const {shop}=await requireActiveOwner(),id=str(form,"id",100);
 await db.blockedDate.deleteMany({where:{id,shopId:shop.id}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}

export async function updateSlotSettings(form:FormData){
 const {shop}=await requireActiveOwner(),id=str(form,"professionalId",100);
 const interval=Number(str(form,"slotIntervalMinutes",3)),limit=Number(str(form,"maxDailyBookings",3));
 if(![15,30,45,60,90,120].includes(interval)||!Number.isInteger(limit)||limit<0||limit>100)return;
 await db.professional.updateMany({where:{id,shopId:shop.id},data:{slotIntervalMinutes:interval,maxDailyBookings:limit}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}

export async function updateWeeklySchedule(form:FormData){
 const {shop}=await requireActiveOwner(),professionalId=str(form,"professionalId",100);
 const pro=await db.professional.findFirst({where:{id:professionalId,shopId:shop.id},select:{id:true}});
 if(!pro)return;
 const entries=[];
 for(let weekday=0;weekday<7;weekday++){
  const enabled=form.get("enabled_"+weekday)==="on";
  const startMinute=toMinute(str(form,"start_"+weekday)),endMinute=toMinute(str(form,"end_"+weekday));
  if(startMinute<0||endMinute<=startMinute||endMinute>1440)return;
  entries.push({weekday,enabled,startMinute,endMinute});
 }
 await db.$transaction(entries.map(h=>db.workingHour.upsert({where:{professionalId_weekday:{professionalId,weekday:h.weekday}},create:{professionalId,...h},update:h})));
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
