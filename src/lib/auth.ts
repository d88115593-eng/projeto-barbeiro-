import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
const COOKIE = "barbernex_session";
const MASTER_COOKIE = "barbernex_master_session";
export const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");
export async function currentUser() {
 const token = (await cookies()).get(COOKIE)?.value;
 if (!token) return null;
 const session = await db.session.findUnique({where:{tokenHash:hashToken(token)},include:{user:{include:{shop:true}}}});
 if (!session || session.expiresAt <= new Date()) return null;
 return session.user;
}
export async function createSession(userId: string, master=false) {
 const raw = randomBytes(32).toString("hex");
 const expiresAt = new Date(Date.now() + 1000*60*60*24*14);
 await db.session.create({data:{userId,tokenHash:hashToken(raw),expiresAt}});
 (await cookies()).set(master?MASTER_COOKIE:COOKIE,raw,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:expiresAt});
}
export async function destroySession(master=false) {
 const cookieStore = await cookies();
 const raw = cookieStore.get(master?MASTER_COOKIE:COOKIE)?.value;
 if (raw) await db.session.deleteMany({where:{tokenHash:hashToken(raw)}});
 cookieStore.delete(master?MASTER_COOKIE:COOKIE);
}
export async function masterUser(){
 const token=(await cookies()).get(MASTER_COOKIE)?.value;
 if(!token)return null;
 const session=await db.session.findUnique({where:{tokenHash:hashToken(token)},include:{user:true}});
 if(!session || session.expiresAt<=new Date() || session.user.role!=="MASTER")return null;
 return session.user;
}
export async function requireMaster(){
 const user=await masterUser();
 if(!user)redirect("/master/login");
 return user;
}
export async function requireOwner() {
 const user = await currentUser();
 if (!user) redirect("/login");
 if (user.role !== "OWNER" || !user.shopId || !user.shop) redirect("/login");
 if(user.mustChangePassword)redirect("/alterar-senha");
 return { user, shop: user.shop };
}
export async function requireActiveOwner() {
 const {user,shop}=await requireOwner();
 if(shop.status!=="ACTIVE" || !shop.paidThrough || shop.paidThrough < new Date()) redirect("/admin?assinatura=pendente");
 return {user,shop};
}
