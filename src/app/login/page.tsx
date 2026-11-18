import Link from "next/link";
import {Brand} from "@/components/Brand";
import {signIn} from "@/app/actions/auth";
export default async function Login({searchParams}:{searchParams:Promise<{erro?:string;cadastro?:string}>}) {
 const query=await searchParams;
 return <div className="auth-wrap"><div className="auth-card"><Brand/><span className="eyebrow">ACESSO EXCLUSIVO PARA BARBEARIAS</span><h1>Acesse sua conta.</h1><p>Seu negócio continua de onde você parou.</p>{query.cadastro&&<div className="notice success">Cadastro realizado. Aguarde a ativação pelo administrador após a validação da assinatura.</div>}{query.erro&&<div className="notice error">Usuário ou senha incorretos.</div>}<form action={signIn} className="stack"><label>Usuário<input name="username" autoComplete="username" placeholder="seu_usuario" required/></label><label>Senha<input type="password" name="password" autoComplete="current-password" placeholder="Sua senha" required/></label><button type="submit" className="button full">Entrar no painel</button></form><p className="auth-foot">Ainda não tem conta? <Link href="/cadastro">Criar minha barbearia</Link></p></div></div>
}
