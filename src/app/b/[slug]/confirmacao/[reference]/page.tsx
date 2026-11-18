import Link from "next/link";
import {notFound} from "next/navigation";
import {CircleCheck,MessageCircle} from "lucide-react";
import {formatInTimeZone} from "date-fns-tz";
import {db} from "@/lib/db";
import {brl,onlyDigits} from "@/lib/format";
export const dynamic="force-dynamic";
export default async function Confirmation({params}:{params:Promise<{slug:string;reference:string}>}){
 const {slug,reference}=await params;
 const booking=await db.appointment.findUnique({where:{reference},include:{shop:true,professional:true,service:true}});
 if(!booking || booking.shop.slug!==slug || booking.source!=="ONLINE")notFound();
 const when=formatInTimeZone(booking.startAt,booking.shop.timezone,"dd/MM/yyyy 'às' HH:mm");
 const phone=onlyDigits(booking.shop.whatsapp);
 const to=phone.startsWith("55")?phone:"55"+phone;
 const text=encodeURIComponent(`Olá! Acabei de agendar pelo site da ${booking.shop.name}. Reserva ${booking.reference}: ${booking.service.name} com ${booking.professional.name}, ${when}.`);
 return <div className="auth-wrap"><div className="auth-card center"><CircleCheck size={58} color="#3B82F6"/><span className="eyebrow">AGENDAMENTO REGISTRADO</span><h1>Seu horário está reservado!</h1><p>Guarde as informações do seu atendimento.</p><div className="receipt"><div><span>Serviço</span><b>{booking.service.name}</b></div><div><span>Profissional</span><b>{booking.professional.name}</b></div><div><span>Data</span><b>{when}</b></div><div><span>Valor</span><b>{brl(booking.amountCents)}</b></div><div><span>Pagamento</span><b>{booking.paymentMethod==="PIX"?"Pix manual":"Na barbearia"}</b></div></div>{booking.paymentMethod==="PIX"&&<div className="notice">Chave Pix informada pela barbearia: <b>{booking.shop.pixKey||"Solicite pelo WhatsApp"}</b>. O pagamento não é confirmado automaticamente; combine o envio do comprovante com a barbearia.</div>}{phone&&<a className="button full" href={`https://wa.me/${to}?text=${text}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> Enviar confirmação pelo WhatsApp</a>}<Link href={"/b/"+slug} className="button button-ghost full">Voltar à barbearia</Link><p className="fineprint">O WhatsApp abre uma mensagem pronta; o envio depende da sua confirmação.</p></div></div>
}
