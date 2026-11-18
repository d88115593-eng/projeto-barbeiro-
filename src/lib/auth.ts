import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
const COOKIE = "barbernex_session";
export const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");
export async function currentUser() {
 const token = (await cookies()).get(COOKIE)?.value;
 if (!token) return null;
 const session = await db.session.findUnique({where:{tokenHash:hashToken(token)},include:{user:{include:{shop:true}}}});
 if (!session || session.expiresAt <= new Date()) return null;
 return session.user;
}
export async function createSession(userId: string) {
 const raw = randomBytes(32).toString("hex");
 const expiresAt = new Date(Date.now() + 1000*60*60*24*14);
 await db.session.create({data:{userId,tokenHash:hashToken(raw),expiresAt}});
 (await cookies()).set(COOKIE,raw,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:expiresAt});
}
export async function destroySession() {
 const cookieStore = await cookies();
 const raw = cookieStore.get(COOKIE)?.value;
 if (raw) await db.session.deleteMany({where:{tokenHash:hashToken(raw)}});
 cookieStore.delete(COOKIE);
}
export async function requireMaster() {
 const user = await currentUser();
 if (!user) redirect("/login");
 if (user.role !== "MASTER") redirect("/admin");
 return user;
}
export async function requireOwner() {
 const user = await currentUser();
 if (!user) redirect("/login");
 if (user.role !== "OWNER" || !user.shopId || !user.shop) redirect("/master");
 return { user, shop: user.shop };
}
export async function requireActiveOwner() {
 const {user,shop}=await requireOwner();
 if(shop.status!=="ACTIVE" || !shop.paidThrough || shop.paidThrough < new Date()) redirect("/admin?assinatura=pendente");
 return {user,shop};
}
