import QRCode from "qrcode";
import {buildPixCode} from "@/lib/pix";
import {brl} from "@/lib/format";
import {PixCopyButton} from "@/components/PixCopyButton";
export async function PixPayment({pixKey,recipient,amountCents,reference}:{pixKey:string;recipient:string;amountCents:number;reference:string}){
 let code="";try{code=buildPixCode({key:pixKey,name:recipient,amountCents,reference});}catch{return <div className="notice error">Dados Pix incompletos. Solicite a chave à barbearia.</div>}
 const src=await QRCode.toDataURL(code,{width:250,margin:2,errorCorrectionLevel:"M"});
 return <div className="pix-payment"><span className="eyebrow">PAGAMENTO PIX</span><h2>Escaneie para pagar</h2><p>Destinatário: <strong>{recipient}</strong></p><img width={230} height={230} alt="QR Code Pix para pagamento do agendamento" src={src}/><strong className="pix-total">{brl(amountCents)}</strong><PixCopyButton code={code}/><p className="fineprint">Este QR Code direciona o Pix para a chave cadastrada pela barbearia. O sistema não confirma pagamentos automaticamente. Envie o comprovante e aguarde a confirmação do estabelecimento.</p></div>;
}
