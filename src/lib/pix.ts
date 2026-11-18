// Pix BR Code EMV, QR estático com valor fixo. Sem integração bancária.
const field=(id:string,value:string)=>id+String(new TextEncoder().encode(value).length).padStart(2,"0")+value;
const normalize=(s:string,max:number)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9 .-]/g,"").trim().toUpperCase().slice(0,max);
function crc16(payload:string){let crc=0xffff;for(const b of new TextEncoder().encode(payload)){crc^=b<<8;for(let i=0;i<8;i++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;}return crc.toString(16).toUpperCase().padStart(4,"0");}
export function buildPixCode({key,name,amountCents,reference}:{key:string;name:string;amountCents:number;reference:string}){
 if(!key||!name||amountCents<=0)throw new Error("Pix inválido");
 const merchant=field("00","br.gov.bcb.pix")+field("01",key.trim());
 const txid=normalize(reference,25).replace(/[^A-Z0-9]/g,"").slice(0,25)||"***";
 const payload=field("00","01")+field("26",merchant)+field("52","0000")+field("53","986")+field("54",(amountCents/100).toFixed(2))+field("58","BR")+field("59",normalize(name,25))+field("60","BRASILIA")+field("62",field("05",txid))+"6304";
 return payload+crc16(payload);
}
