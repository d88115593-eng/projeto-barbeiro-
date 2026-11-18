export const brl = (cents: number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
export const moneyInput = (form: FormData, key:string) => {
 const amount=Number(String(form.get(key)??""));
 if(!Number.isFinite(amount) || amount<=0 || amount>1000000) throw new Error("Valor inválido");
 return Math.round(amount*100);
};
export const str = (form:FormData,key:string,max=255) => String(form.get(key)??"").trim().slice(0,max);
export const urlOrBlank = (v:string) => {
 if(!v) return "";
 if(/^\/api\/media\/[a-f0-9-]{36}\.(jpg|png|webp|mp4)$/i.test(v)) return v;
 try { const u=new URL(v); if(u.protocol!=="https:" && u.protocol!=="http:") return "";return u.toString(); } catch {return "";}
};
export const onlyDigits = (v:string) => v.replace(/\D/g,"");
export const dateLabel=(d:Date)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Bahia",dateStyle:"short",timeStyle:"short"}).format(d);
