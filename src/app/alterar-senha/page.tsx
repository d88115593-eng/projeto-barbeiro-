import {redirect} from "next/navigation";
import {currentUser} from "@/lib/auth";
import {changeOwnPassword} from "@/app/actions/auth";
import {Brand} from "@/components/Brand";
export default async function ChangePassword(){const user=await currentUser();if(!user||user.role!=="OWNER")redirect("/login");return <div className="auth-wrap"><div className="auth-card"><Brand/><span className="eyebrow">SEGURANÇA DA CONTA</span><h1>Defina sua nova senha.</h1><p>O administrador redefiniu seu acesso. Para continuar, crie uma senha exclusiva com pelo menos 12 caracteres.</p><form action={changeOwnPassword} className="stack"><label>Nova senha<input name="password" type="password" minLength={12} autoComplete="new-password" required/></label><label>Confirme a nova senha<input name="confirm" type="password" minLength={12} autoComplete="new-password" required/></label><button className="button full">Atualizar senha e entrar novamente</button></form></div></div>}
