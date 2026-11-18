import Link from "next/link";
import {redirect} from "next/navigation";
import {ShieldCheck} from "lucide-react";
import {Brand} from "@/components/Brand";
import {masterUser} from "@/lib/auth";
import {signInMaster} from "@/app/actions/auth";
export const dynamic="force-dynamic";
export default async function MasterLogin({searchParams}:{searchParams:Promise<{erro?:string}>}){
 if(await masterUser())redirect("/master");
 const query=await searchParams;
 return <div className="auth-wrap master-auth"><div className="auth-card"><Brand/><span className="eyebrow"><ShieldCheck size={15}/> ACESSO RESTRITO • ADMINISTRAÇÃO</span><h1>Central Master<span className="accent-text">.</span></h1><p>Área exclusiva do administrador BARBERNEX. O acesso das barbearias é separado.</p>{query.erro&&<div className="notice error">Credenciais de administrador inválidas.</div>}<form action={signInMaster} className="stack"><label>Login do administrador<input name="username" autoComplete="username" required/></label><label>Senha do administrador<input name="password" type="password" autoComplete="current-password" required/></label><button className="button full" type="submit">Entrar na central segura</button></form><p className="auth-foot"><Link href="/login">← Voltar ao acesso das barbearias</Link></p></div></div>;
}
