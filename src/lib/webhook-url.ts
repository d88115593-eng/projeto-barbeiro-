import {lookup} from "node:dns/promises";
import {isIP} from "node:net";
/** Basic outbound webhook guard. Also use an infrastructure-level egress firewall in production.
 * DNS is checked on request; DNS rebinding between lookup and fetch is still a residual risk.
 */
function publicAddress(address:string):boolean{
 if(address.includes(":")){
  const a=address.toLowerCase();
  // Only globally-routable IPv6 (2000::/3) should be considered for outbound calls.
  if(!/^[23][0-9a-f]{0,3}:/i.test(a))return false;
  if(a.startsWith("2001:db8:"))return false;
  return true;
 }
 const octets=address.split(".").map(Number);
 if(octets.length!==4||octets.some(x=>x<0||x>255||!Number.isInteger(x)))return false;
 const [a,b,c]=octets;
 return !(a===0||a===10||a===127||a>=224||
  (a===100&&b>=64&&b<=127)||
  (a===169&&b===254)||
  (a===172&&b>=16&&b<=31)||
  (a===192&&(b===168||b===0||b===88&&c===99||b===0&&c===2))||
  (a===198&&(b===18||b===19||b===51&&c===100))||
  (a===203&&b===0&&c===113));
}
export async function validatedWebhookUrl(raw:string):Promise<string|null>{
 if(!raw||raw.length>1200)return null;
 try{
  const url=new URL(raw);
  const hostname=url.hostname.toLowerCase().replace(/\.$/,"");
  if(url.protocol!=="https:"||url.username||url.password||url.port||url.hash||
     hostname.length>253||!hostname.includes(".")||isIP(hostname)||/^(localhost|metadata)(\.|$)/.test(hostname)||
     /\.(local|internal|localhost|test|invalid|example|onion)$/.test(hostname))return null;
  const records=await lookup(hostname,{all:true});
  if(!records.length||records.length>32||records.some(r=>!publicAddress(r.address)))return null;
  return url.toString();
 }catch{return null;}
}
