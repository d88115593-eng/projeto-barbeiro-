"use server";
import { revalidatePath } from "next/cache";
import {fromZonedTime} from "date-fns-tz";
import {initialServices} from "@/lib/default-services";
import {validatedWebhookUrl} from "@/lib/webhook-url";
import {sendBookingWebhook,testShopWebhook} from "@/lib/notification-webhook";
import {redirect} from "next/navigation";
import {db} from "@/lib/db";
import {requireActiveOwner,requireOwner} from "@/lib/auth";
import {moneyInput,str,urlOrBlank,onlyDigits} from "@/lib/format";
export async function updateSite(form:FormData) {
 const {shop}=await requireOwner();
 const name=str(form,"name",80),description=str(form,"description",2000),whatsapp=str(form,"whatsapp",20);
 const slug=str(form,"slug",40).toLowerCase();
 if(!/^[a-z0-9-]{3,40}$/.test(slug))return;
 if(slug!==shop.slug&&await db.barbershop.findUnique({where:{slug}}))return;
 const color=str(form,"accentColor",7);
 if(name.length<3)return;
 const pixKey=str(form,"pixKey",180),pixRecipientName=str(form,"pixRecipientName",80);
 if(form.get("pixEnabled")==="on" && (!pixKey||!pixRecipientName))return;
 if(shop.depositMode==="REQUIRED" && form.get("pixEnabled")!=="on")return;
 await db.barbershop.update({where:{id:shop.id},data:{
  name,slug,description,whatsapp,address:str(form,"address",300),instagram:str(form,"instagram",120),
  heroTitle:str(form,"heroTitle",140)||"Seu estilo começa aqui.",heroSubtitle:str(form,"heroSubtitle",400),
  showServices:form.get("showServices")==="on",showTeam:form.get("showTeam")==="on",
  showGallery:form.get("showGallery")==="on",showReviews:form.get("showReviews")==="on",
  timezone:["America/Bahia","America/Sao_Paulo","America/Belem","America/Manaus","America/Cuiaba","America/Porto_Velho","America/Rio_Branco"].includes(str(form,"timezone",40))?str(form,"timezone",40):"America/Bahia",
  logoUrl:urlOrBlank(str(form,"logoUrl",800)),coverUrl:urlOrBlank(str(form,"coverUrl",800)),
  logoStyle:["CARD","ROUND","MINIMAL"].includes(str(form,"logoStyle",12))?str(form,"logoStyle",12):"CARD",
  accentColor:/^#[0-9a-f]{6}$/i.test(color)?color:"#2563FF",
  pixKey,pixRecipientName,pixEnabled:form.get("pixEnabled")==="on",
  payAtShopEnabled:form.get("payAtShopEnabled")==="on",
 }});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);revalidatePath("/b/"+slug);
}
export async function updateMonthlyGoal(form:FormData){
 const {shop}=await requireOwner();
 const raw=str(form,"monthlyGoal",20);
 if(!/^(?:\d{1,7})(?:\.\d{1,2})?$/.test(raw))return;
 const monthlyGoalCents=Math.round(Number(raw)*100);
 if(!Number.isSafeInteger(monthlyGoalCents)||monthlyGoalCents<0||monthlyGoalCents>100000000)return;
 await db.barbershop.update({where:{id:shop.id},data:{monthlyGoalCents}});
 revalidatePath("/admin");
}
export async function editAppointmentFromOwner(form:FormData){
 const {shop,user}=await requireActiveOwner();
 const id=str(form,"id",100),serviceId=str(form,"serviceId",100),professionalId=str(form,"professionalId",100);
 const clientName=str(form,"clientName",80),clientPhone=onlyDigits(str(form,"clientPhone",25));
 const amountCents=moneyInput(form,"amount"),date=str(form,"date",10),hour=str(form,"hour",5),reason=str(form,"reason",250);
 if(clientName.length<2||clientPhone.length<10||clientPhone.length>13||!Number.isSafeInteger(amountCents)||amountCents<0||amountCents>10000000||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||!/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(hour)||reason.length<3)return;
 const dateObj=new Date(date+"T00:00:00Z");
 if(Number.isNaN(dateObj.getTime())||dateObj.toISOString().slice(0,10)!==date)return;
 const [booking,service,pro]=await Promise.all([
  db.appointment.findFirst({where:{id,shopId:shop.id}}),
  db.service.findFirst({where:{id:serviceId,shopId:shop.id,active:true}}),
  db.professional.findFirst({where:{id:professionalId,shopId:shop.id,active:true},include:{hours:true}})
 ]);
 if(!booking||!service||!pro||booking.status==="CANCELLED"||booking.status==="NO_SHOW")return;
 const startAt=fromZonedTime(date+"T"+hour+":00",shop.timezone),endAt=new Date(startAt.getTime()+service.durationMinutes*60000);
 const dayHours=pro.hours.find(h=>h.weekday===dateObj.getUTCDay()&&h.enabled);
 const startMinute=Number(hour.slice(0,2))*60+Number(hour.slice(3));
 if(!dayHours||startMinute<dayHours.startMinute||startMinute+service.durationMinutes>dayHours.endMinute)return;
 if(startAt.getTime()<Date.now()-60000&&booking.status==="CONFIRMED")return;
 if(await db.blockedDate.findFirst({where:{shopId:shop.id,date,OR:[{professionalId:null},{professionalId}]}}))return;
 let changed=false;
 try{
 await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT "id" FROM "Professional" WHERE "id" = ${professionalId} FOR UPDATE`;
  const current=await tx.appointment.findFirst({where:{id,shopId:shop.id}});
  if(!current||current.status==="CANCELLED"||current.status==="NO_SHOW")throw new Error("Reserva indisponível");
  const overlap=await tx.appointment.findFirst({where:{id:{not:id},shopId:shop.id,professionalId,status:{in:["CONFIRMED","COMPLETED"]},startAt:{lt:endAt},endAt:{gt:startAt}}});
  if(overlap)throw new Error("Conflito de agenda");
  const changedDay=current.professionalId!==professionalId||current.startAt.getTime()!==startAt.getTime();
  if(changedDay&&pro.maxDailyBookings>0){
   const tomorrow=new Date(dateObj.getTime()+86400000).toISOString().slice(0,10);
   const dayStart=fromZonedTime(date+"T00:00:00",shop.timezone),dayEnd=fromZonedTime(tomorrow+"T00:00:00",shop.timezone);
   const count=await tx.appointment.count({where:{id:{not:id},shopId:shop.id,professionalId,status:{in:["CONFIRMED","COMPLETED"]},startAt:{gte:dayStart,lt:dayEnd}}});
   if(count>=pro.maxDailyBookings)throw new Error("Limite diário");
  }
  const before={serviceId:current.serviceId,professionalId:current.professionalId,clientName:current.clientName,clientPhone:current.clientPhone,amountCents:current.amountCents,startAt:current.startAt.toISOString(),endAt:current.endAt.toISOString()};
  const after={serviceId,professionalId,clientName,clientPhone,amountCents,startAt:startAt.toISOString(),endAt:endAt.toISOString()};
  if(JSON.stringify(before)===JSON.stringify(after))return;
  await tx.appointment.update({where:{id},data:{serviceId,professionalId,clientName,clientPhone,amountCents,startAt,endAt}});
  await tx.appointmentChange.create({data:{appointmentId:id,shopId:shop.id,actorId:user.id,beforeJson:before,afterJson:after,reason}});
  changed=true;
 });
 }catch{return;}
 if(changed)await sendBookingWebhook(shop.id,id,"booking.updated");
 revalidatePath("/admin");
}
export async function createService(form:FormData){
 const {shop}=await requireOwner();
 const name=str(form,"name",75),duration=Number(str(form,"durationMinutes",4)),description=str(form,"description",300);
 if(name.length<2 || !Number.isInteger(duration) || duration<15 || duration>360)return;
 const imageUrl=str(form,"imageUrl",600);
 if(imageUrl&&!imageUrl.startsWith("/api/media/")&&!/^https:\/\/[^\s]+$/i.test(imageUrl))return;
 const priceCents=moneyInput(form,"price");
 await db.service.create({data:{shopId:shop.id,name,description,imageUrl,durationMinutes:duration,priceCents}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function toggleService(form:FormData){
 const {shop}=await requireOwner(),id=str(form,"id",100);
 const service=await db.service.findFirst({where:{id,shopId:shop.id}});if(!service)return;
 await db.service.update({where:{id},data:{active:!service.active}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function createProfessional(form:FormData){
 const {shop}=await requireOwner();
 const name=str(form,"name",80),commissionPct=Number(str(form,"commissionPct",3));
 if(name.length<2 || !Number.isInteger(commissionPct) || commissionPct<0 || commissionPct>100)return;
 const hours=[1,2,3,4,5,6].map(weekday=>({weekday,startMinute:540,endMinute:1080}));
 await db.professional.create({data:{shopId:shop.id,name,commissionPct,photoUrl:urlOrBlank(str(form,"photoUrl",800)),hours:{create:hours}}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function toggleProfessional(form:FormData){
 const {shop}=await requireOwner(),id=str(form,"id",100);
 const pro=await db.professional.findFirst({where:{id,shopId:shop.id}});if(!pro)return;
 await db.professional.update({where:{id},data:{active:!pro.active}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
const toMinute=(value:string)=>{
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return -1;
 const [h,m]=value.split(":").map(Number);return h*60+m;
};
export async function updateSchedule(form:FormData){
 const {shop}=await requireOwner(),professionalId=str(form,"professionalId",100),weekday=Number(str(form,"weekday",2));
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
 const paid=form.get("paid")==="on";
 await db.appointment.create({data:{shopId:shop.id,professionalId,serviceId,clientName,clientPhone,startAt,endAt,amountCents:service.priceCents,source:"WALK_IN",status:"COMPLETED",paymentStatus:paid?"PAID":"PENDING",paidAt:paid?startAt:null,paymentMethod:"AT_SHOP"}});
 revalidatePath("/admin");
}
export async function updateBooking(form:FormData){
 const {shop,user}=await requireActiveOwner(),id=str(form,"id",100),operation=str(form,"operation",20);
 if(!["complete","paid","cancel","no_show"].includes(operation))return;
 const changed=await db.$transaction(async tx=>{
  const condition={id,shopId:shop.id};
  let count=0;
  if(operation==="complete")count=(await tx.appointment.updateMany({where:{...condition,status:"CONFIRMED"},data:{status:"COMPLETED"}})).count;
  else if(operation==="paid")count=(await tx.appointment.updateMany({where:{...condition,status:"COMPLETED",paymentStatus:"PENDING"},data:{paymentStatus:"PAID",paidAt:new Date()}})).count;
  else if(operation==="cancel")count=(await tx.appointment.updateMany({where:{...condition,status:{in:["CONFIRMED","AWAITING_PAYMENT"]}},data:{status:"CANCELLED"}})).count;
  else if(operation==="no_show")count=(await tx.appointment.updateMany({where:{...condition,status:"CONFIRMED"},data:{status:"NO_SHOW"}})).count;
  if(count)await tx.auditLog.create({data:{shopId:shop.id,actorId:user.id,event:"AGENDAMENTO_"+operation.toUpperCase()}});
  return count>0;
 });
 if(changed&&operation==="cancel")await sendBookingWebhook(shop.id,id,"booking.cancelled");
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
 const {shop}=await requireOwner(),clientName=str(form,"clientName",80),message=str(form,"message",500),rating=Number(str(form,"rating",1));
 if(clientName.length<2||message.length<5||!Number.isInteger(rating)||rating<1||rating>5)return;
 await db.review.create({data:{shopId:shop.id,clientName,message,rating,photoUrl:urlOrBlank(str(form,"photoUrl",800)),approved:true}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function addMedia(form:FormData){
 const {shop}=await requireOwner(),url=urlOrBlank(str(form,"url",900)),caption=str(form,"caption",180),type=str(form,"type",10);
 if(!url||!["IMAGE","VIDEO"].includes(type))return;
 await db.media.create({data:{shopId:shop.id,url,caption,type}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function removeMedia(form:FormData){
 const {shop}=await requireOwner(),id=str(form,"id",100);
 await db.media.deleteMany({where:{id,shopId:shop.id}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}

export async function updateProfessional(form:FormData){
 const {shop}=await requireOwner(),id=str(form,"id",100),name=str(form,"name",80),commissionPct=Number(str(form,"commissionPct",3));
 if(name.length<2||!Number.isInteger(commissionPct)||commissionPct<0||commissionPct>100)return;
 await db.professional.updateMany({where:{id,shopId:shop.id},data:{name,commissionPct,photoUrl:urlOrBlank(str(form,"photoUrl",800))}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function updateService(form:FormData){
 const {shop}=await requireOwner(),id=str(form,"id",100),name=str(form,"name",80),duration=Number(str(form,"durationMinutes",4));
 if(name.length<2||!Number.isInteger(duration)||duration<15||duration>360)return;
 const imageUrl=str(form,"imageUrl",600);
 if(imageUrl&&!imageUrl.startsWith("/api/media/")&&!/^https:\/\/[^\s]+$/i.test(imageUrl))return;
 const priceCents=moneyInput(form,"price");
 await db.service.updateMany({where:{id,shopId:shop.id},data:{name,priceCents,imageUrl,durationMinutes:duration,description:str(form,"description",300)}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function addBlockedDate(form:FormData){
 const {shop}=await requireOwner(),date=str(form,"date",10),raw=str(form,"professionalId",100);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+"T00:00:00Z")))return;
 const professionalId=raw==="ALL"?null:raw;
 if(professionalId && !await db.professional.findFirst({where:{id:professionalId,shopId:shop.id}}))return;
 await db.blockedDate.create({data:{shopId:shop.id,date,professionalId,note:str(form,"note",120)}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
export async function removeBlockedDate(form:FormData){
 const {shop}=await requireOwner(),id=str(form,"id",100);
 await db.blockedDate.deleteMany({where:{id,shopId:shop.id}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}

export async function updateSlotSettings(form:FormData){
 const {shop}=await requireOwner(),id=str(form,"professionalId",100);
 const interval=Number(str(form,"slotIntervalMinutes",3)),limit=Number(str(form,"maxDailyBookings",3));
 if(![15,30,45,60,90,120].includes(interval)||!Number.isInteger(limit)||limit<0||limit>100)return;
 await db.professional.updateMany({where:{id,shopId:shop.id},data:{slotIntervalMinutes:interval,maxDailyBookings:limit}});
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}

export async function updateWeeklySchedule(form:FormData){
 const {shop}=await requireOwner(),professionalId=str(form,"professionalId",100);
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

/** Aplicar somente quando a barbearia ainda não possui serviços, sem restaurar itens removidos. */
export async function loadInitialServices(form:FormData){
 const {shop}=await requireOwner();
 await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT "id" FROM "Barbershop" WHERE "id" = ${shop.id} FOR UPDATE`;
  if(await tx.service.count({where:{shopId:shop.id}}))return;
  await tx.service.createMany({data:initialServices.map(service=>({...service,shopId:shop.id}))});
 });
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}

/** Integração opcional com serviços de automação que aceitam webhooks HTTPS. */
export async function updateNotificationIntegration(form:FormData){
 const {shop}=await requireOwner();
 const enabled=form.get("notificationWebhookEnabled")==="on";
 const raw=str(form,"notificationWebhookUrl",1200).trim();
 if(raw&&!await validatedWebhookUrl(raw))return;
 if(enabled&&!raw)return;
 await db.barbershop.update({where:{id:shop.id},data:{notificationWebhookUrl:raw,notificationWebhookEnabled:enabled}});
 revalidatePath("/admin");
}

/** Sends a safe synthetic event so the shop owner can confirm integration setup. */
export async function testNotificationFromOwner(){
 const {shop}=await requireOwner();
 const ok=await testShopWebhook(shop.id);
 redirect("/admin?webhook="+(ok?"ok":"falha")+"#notificacoes");
}
/** Manual retry of one failed event. No automatic duplicate messages. */
export async function retryNotificationFromOwner(form:FormData){
 const {shop}=await requireOwner();
 if(!shop.notificationWebhookEnabled)return;
 const id=str(form,"id",100);
 const delivery=await db.notificationDelivery.findFirst({where:{id,shopId:shop.id,status:"FAILED"}});
 if(!delivery||!["booking.created","booking.updated","booking.cancelled"].includes(delivery.event))return;
 const event=delivery.event as "booking.created"|"booking.updated"|"booking.cancelled";
 const ok=await sendBookingWebhook(shop.id,delivery.appointmentId,event);
 redirect("/admin?webhook="+(ok?"ok":"falha")+"#notificacoes");
}

/** Política de cobrança individual, desligada por padrão, nunca vinculada ao Pix do Master. */
export async function updateDepositPolicy(form:FormData){
 const {shop,user}=await requireOwner();
 if(shop.status==="SUSPENDED")return;
 const depositMode=str(form,"depositMode",12);
 const depositPricing=str(form,"depositPricing",8);
 const depositPercent=Number(str(form,"depositPercent",3));
 const depositDueMinutes=Number(str(form,"depositDueMinutes",3));
 const depositMessage=str(form,"depositMessage",350);
 const raw=str(form,"depositFixed",12);
 if(!["DISABLED","OPTIONAL","REQUIRED"].includes(depositMode)||!["FIXED","PERCENT"].includes(depositPricing))return;
 if(!/^(?:\d{1,5})(?:\.\d{1,2})?$/.test(raw))return;
 const depositFixedCents=Math.round(Number(raw)*100);
 if(!Number.isSafeInteger(depositFixedCents)||depositFixedCents<100||depositFixedCents>10000000||!Number.isInteger(depositPercent)||depositPercent<1||depositPercent>100||!Number.isInteger(depositDueMinutes)||depositDueMinutes<10||depositDueMinutes>120)return;
 // Sem confirmação automática de um Pix estático: o proprietário confere no banco.
 if(depositMode!=="DISABLED"&&(!shop.pixEnabled||!shop.pixKey||!shop.pixRecipientName))return;
 await db.$transaction([
  db.barbershop.update({where:{id:shop.id},data:{depositMode:depositMode as "DISABLED"|"OPTIONAL"|"REQUIRED",depositPricing:depositPricing as "FIXED"|"PERCENT",depositFixedCents,depositPercent,depositDueMinutes,depositMessage,depositDeducts:form.get("depositDeducts")==="on"}}),
  db.auditLog.create({data:{actorId:user.id,shopId:shop.id,event:"POLITICA_SINAL_ATUALIZADA"}})
 ]);
 revalidatePath("/admin");revalidatePath("/b/"+shop.slug);
}
/** Somente após confirmar o crédito no banco; comprovante e QR não bastam. */
export async function confirmDeposit(form:FormData){
 const {shop,user}=await requireActiveOwner();
 const id=str(form,"id",100);
 const now=new Date();
 const changed=await db.$transaction(async tx=>{
  const booking=await tx.appointment.findFirst({where:{id,shopId:shop.id,depositStatus:"PENDING",status:{in:["AWAITING_PAYMENT","CONFIRMED"]}}});
  if(!booking || (booking.depositExpiresAt&&booking.depositExpiresAt<=now))return null;
  const result=await tx.appointment.updateMany({where:{id,shopId:shop.id,depositStatus:"PENDING",status:booking.status},data:{status:"CONFIRMED",depositStatus:"PAID",depositPaidAt:now}});
  if(!result.count)return null;
  await tx.auditLog.create({data:{actorId:user.id,shopId:shop.id,event:"SINAL_CONFIRMADO_MANUALMENTE"}});
  return booking;
 });
 if(changed&&changed.status==="AWAITING_PAYMENT")await sendBookingWebhook(shop.id,changed.id,"booking.updated");
 revalidatePath("/admin");
}
