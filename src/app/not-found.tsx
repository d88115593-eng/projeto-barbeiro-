import Link from "next/link";
import {Brand} from "@/components/Brand";
export default function NotFound(){return <div className="auth-wrap"><div className="auth-card"><Brand/><h1>Página não encontrada.</h1><p>Esse endereço pode estar incorreto ou ter sido removido.</p><Link href="/" className="button full">Voltar à BARBERNEX</Link></div></div>}
