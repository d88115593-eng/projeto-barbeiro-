import {db} from "@/lib/db";
/** Sends booking events to the shop's configured automation endpoint.
 * A webhook is not a WhatsApp integration on its own: the owner must connect an external app.
 * Delivery is best-effort; it must never invalidate a successful booking.
 */
export async function sendBookingWebhook(shopId:string,appointmentId:string,event:"booking.created"|"booking.updated"|"booking.cancelled"="booking.created"){
 try{
  const shop=await db.barbershop.findUnique({where:{id:shopId},select:{id:true,name:true,slug:true,timezone:true,notificationWebhookEnabled:true,notificationWebhookUrl:true}});
  if(!shop?.notificationWebhookEnabled||!shop.notificationWebhookUrl)return;
  const url=new URL(shop.notificationWebhookUrl);
  const host=url.hostname.toLowerCase();
  if(url.protocol!=="https:"||url.username||url.password||url.port||host==="localhost"||host.endsWith(".local")||host.endsWith(".internal")||/^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(host)||host.includes(":")||!host.includes("."))return;
  const booking=await db.appointment.findFirst({where:{id:appointmentId,shopId},include:{service:{select:{name:true}},professional:{select:{name:true}}}});
  if(!booking)return;
  const payload={event,shop:{id:shop.id,name:shop.name,slug:shop.slug,timezone:shop.timezone},appointment:{id:booking.id,reference:booking.reference,clientName:booking.clientName,clientPhone:booking.clientPhone,service:booking.service.name,professional:booking.professional.name,startAt:booking.startAt.toISOString(),endAt:booking.endAt.toISOString(),amountCents:booking.amountCents,status:booking.status,paymentStatus:booking.paymentStatus}};
  await fetch(url.toString(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(4000),redirect:"error",cache:"no-store"});
 }catch(error){console.error("Booking webhook delivery failed",error instanceof Error?error.message:"unknown error");}
}
