import {db} from "@/lib/db";
import {validatedWebhookUrl} from "@/lib/webhook-url";
export type BookingEvent="booking.created"|"booking.updated"|"booking.cancelled";
/** Best-effort webhook delivery. HTTP 2xx means accepted by the automation endpoint,
 * not that WhatsApp/Telegram delivered the final message to a device.
 * Never throws into a completed booking; failed attempts can be manually retried.
 */
export async function sendBookingWebhook(shopId:string,appointmentId:string,event:BookingEvent="booking.created"):Promise<boolean>{
 let attempted=false,httpStatus:number|undefined,accepted=false;
 try{
  const shop=await db.barbershop.findUnique({where:{id:shopId},select:{id:true,name:true,slug:true,timezone:true,notificationWebhookEnabled:true,notificationWebhookUrl:true}});
  if(!shop?.notificationWebhookEnabled||!shop.notificationWebhookUrl)return false;
  attempted=true;
  const url=await validatedWebhookUrl(shop.notificationWebhookUrl);
  if(!url)return false;
  const booking=await db.appointment.findFirst({where:{id:appointmentId,shopId},include:{service:{select:{name:true}},professional:{select:{name:true}}}});
  if(!booking)return false;
  const payload={event,shop:{id:shop.id,name:shop.name,slug:shop.slug,timezone:shop.timezone},appointment:{id:booking.id,reference:booking.reference,clientName:booking.clientName,clientPhone:booking.clientPhone,service:booking.service.name,professional:booking.professional.name,startAt:booking.startAt.toISOString(),endAt:booking.endAt.toISOString(),amountCents:booking.amountCents,status:booking.status,paymentStatus:booking.paymentStatus}};
  const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(4000),redirect:"error",cache:"no-store"});
  httpStatus=response.status;
  accepted=response.ok;
  return accepted;
 }catch(error){
  console.error("Booking notification endpoint failed:",error instanceof Error?error.name:"unknown");
  return false;
 }finally{
  if(attempted){
   try{await db.notificationDelivery.create({data:{shopId,appointmentId,event,status:accepted?"ACCEPTED":"FAILED",httpStatus}});}
   catch{console.error("Unable to record booking notification attempt");}
  }
 }
}
export async function testShopWebhook(shopId:string):Promise<boolean>{
 try{
  const shop=await db.barbershop.findUnique({where:{id:shopId},select:{id:true,name:true,slug:true,notificationWebhookUrl:true,notificationWebhookEnabled:true}});
  if(!shop?.notificationWebhookEnabled)return false;
  const url=await validatedWebhookUrl(shop.notificationWebhookUrl);
  if(!url)return false;
  const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event:"integration.test",shop:{id:shop.id,name:shop.name,slug:shop.slug},message:"BARBERNEX: teste de conexão. Não é um agendamento real.",test:true}),signal:AbortSignal.timeout(4000),redirect:"error",cache:"no-store"});
  return response.ok;
 }catch{return false;}
}
