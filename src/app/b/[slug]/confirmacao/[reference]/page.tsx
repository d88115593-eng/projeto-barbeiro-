import Link from "next/link";
import {notFound} from "next/navigation";
import {CircleCheck,MessageCircle} from "lucide-react";
import {formatInTimeZone} from "date-fns-tz";
import {db} from "@/lib/db";
import {brl,onlyDigits} from "@/lib/format";
import {PixPayment} from "@/components/PixPayment";
import {remainingServiceAmount} from "@/lib/deposit";
export const dynamic="force-dynamic";
export default async function Confirmation({params}:{params:Promise<{slug:string;reference:string}>}){
 const {slug,reference}=await params;
 const booking=await db.appointment.findUnique({where:{reference},include:{shop:true,professional:true,service:true}});
 if(!booking || booking.shop.slug!==slug || booking.source!=="ONLINE")notFound();
 const when=formatInTimeZone(booking.startAt,booking.shop.timezone,"dd/MM/yyyy 'às' HH:mm");
 const awaiting=booking.status==="AWAITING_PAYMENT";
 const expired=awaiting&&!!booking.depositExpiresAt&&booking.depositExpiresAt<=new Date();
 const depositPending=booking.depositStatus==="PENDING";
 const pixAmount=depositPending?booking.depositAmountCents:booking.amountCents;
 const balance=remainingServiceAmount(booking.amountCents,booking.depositAmountCents,booking.shop.depositDeducts);
 const phone=onlyDigits(booking.shop.whatsapp);
 const to=phone.startsWith("55")?phone:"55"+phone;
 const text=encodeURIComponent(`Olá! Minha ${awaiting?"pré-reserva aguardando confirmação de sinal":"reserva"} no site da ${booking.shop.name} é ${booking.reference}: ${booking.service.name} com ${booking.professional.name}, ${when}.`);
 return <div className="auth-wrap"><div className="auth-card center"><CircleCheck size={58} color="#3B82F6"/><span className="eyebrow">{awaiting?"PAGAMENTO DO SINAL":"AGENDAMENTO REGISTRADO"}</span><h1>{expired?"Prazo do sinal encerrado":awaiting?"Seu horário aguarda confirmação":booking.status==="CANCELLED"?"Agendamento cancelado":"Seu horário está reservado!"}</h1><p>{expired?"Essa pré-reserva perdeu a validade. Volte à agenda e escolha outro horário.":awaiting?"Faça o Pix e aguarde a barbearia conferir o crédito no banco. O envio de comprovante não confirma o horário.":"Guarde as informações do seu atendimento."}</p><div className="receipt"><div><span>Serviço</span><b>{booking.service.name}</b></div><div><span>Profissional</span><b>{booking.professional.name}</b></div><div><span>Data</span><b>{when}</b></div><div><span>Valor</span><b>{brl(booking.amountCents)}</b></div><div><span>Pagamento</span><b>{booking.paymentMethod==="PIX"?"Pix manual":"Na barbearia"}</b></div>{booking.depositAmountCents>0&&<><div><span>Sinal</span><b>{brl(booking.depositAmountCents)} · {booking.depositStatus==="PAID"?"Recebido":"Aguardando conferência"}</b></div><div><span>{booking.shop.depositDeducts?"Restante do serviço":"Serviço à parte"}</span><b>{brl(balance)}</b></div></>}{awaiting&&booking.depositExpiresAt&&<div><span>Prazo para pagar</span><b>{formatInTimeZone(booking.depositExpiresAt,booking.shop.timezone,"dd/MM HH:mm")}</b></div>}</div>{booking.paymentMethod==="PIX"&&!expired&&booking.status!=="CANCELLED"&&booking.depositStatus!=="PAID"&&booking.shop.pixKey&&booking.shop.pixRecipientName&&<PixPayment pixKey={booking.shop.pixKey} recipient={booking.shop.pixRecipientName} amountCents={pixAmount} reference={booking.reference}/>}{phone&&<a className="button full" href={`https://wa.me/${to}?text=${text}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> Enviar confirmação pelo WhatsApp</a>}<Link href={"/b/"+slug} className="button button-ghost full">Voltar à barbearia</Link><p className="fineprint">O WhatsApp abre uma mensagem pronta; o envio depende da sua confirmação.</p></div></div>
}
