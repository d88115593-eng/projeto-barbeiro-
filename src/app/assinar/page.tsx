import Link from "next/link";
import {db} from "@/lib/db";
import {brl} from "@/lib/format";
import {buildPixCode} from "@/lib/pix";
import {SalesPixCode} from "@/components/SalesPixCode";
export const dynamic="force-dynamic";
const plans=[{slug:"30",title:"Mensal",days:30},{slug:"90",title:"Trimestral",days:90},{slug:"180",title:"Semestral",days:180}];
export default async function Subscribe({searchParams}:{searchParams:Promise<{plano?:string}>}){
 const {plano}=await searchParams;const settings=await db.platformSettings.findUnique({where:{id:"main"}});
 const prices=[settings?.planMonthlyCents??1990,settings?.planQuarterlyCents??2990,settings?.planSemiannualCents??5990];
 const index=Math.max(0,plans.findIndex(p=>p.slug===plano)),plan=plans[index],price=prices[index];
 let pixCode="";
 if(settings?.salesPixEnabled&&settings.salesPixKey&&settings.salesPixRecipient){try{pixCode=buildPixCode({key:settings.salesPixKey,name:settings.salesPixRecipient,amountCents:price,reference:"BARBERNEX"+plan.days});}catch{pixCode="";}}
 return <div className="auth-wrap"><div className="auth-card sales-checkout"><span className="eyebrow">BARBERNEX · ASSINATURA</span><h1>Escolha como começar</h1><p>Selecione seu plano. Após a confirmação do pagamento, a administração ativa o acesso à plataforma.</p><div className="sales-plan-tabs">{plans.map((p,i)=><Link className={index===i?"active":""} key={p.slug} href={"/assinar?plano="+p.slug}><strong>{p.title}</strong><small>{brl(prices[i])}</small></Link>)}</div><div className="sales-checkout-total"><span>{plan.title} · {plan.days} dias</span><strong>{brl(price)}</strong></div>{pixCode&&<div className="security-info"><strong>Pagamento por Pix</strong><p>Confira o nome do destinatário antes de pagar. Após o pagamento, entre em contato com o suporte para ativar a assinatura.</p><SalesPixCode code={pixCode} recipient={settings?.salesPixRecipient||""}/></div>}{!pixCode&&<div className="notice">Pagamento online ainda não configurado. Cadastre-se e fale com o suporte para ativar seu plano.</div>}<div className="hero-actions"><Link href="/cadastro" className="button">Criar minha conta</Link><Link href="/" className="button button-ghost">Voltar à página inicial</Link></div>{settings?.supportWhatsapp&&<a className="sales-support-link" target="_blank" rel="noopener noreferrer" href={"https://wa.me/"+settings.supportWhatsapp}>Falar com suporte pelo WhatsApp ↗</a>}<p className="fineprint">O Pix não confirma pagamentos automaticamente. A BARBERNEX verifica o recebimento e libera a assinatura manualmente.</p></div></div>;
}