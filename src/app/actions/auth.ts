"use server";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {createSession,destroySession} from "@/lib/auth";
import {str} from "@/lib/format";
export async function register(form:FormData){
 const username=str(form,"username",40).toLowerCase(),name=str(form,"name",70),slug=str(form,"slug",40).toLowerCase(),password=str(form,"password",200);
 if(!/^[a-z0-9_.-]{4,40}$/.test(username) || !/^[a-z0-9-]{3,40}$/.test(slug)|| name.length<3 || password.length<10) redirect("/cadastro?erro=dados");
 const exists=await db.user.findUnique({where:{username}});
 const shopExists=await db.barbershop.findUnique({where:{slug}});
 if(exists||shopExists)redirect("/cadastro?erro=existente");
 const passwordHash=await bcrypt.hash(password,12);
 await db.barbershop.create({data:{name,slug,users:{create:{username,passwordHash,role:"OWNER"}}}});
 redirect("/login?cadastro=realizado");
}
export async function signIn(form:FormData){
 const username=str(form,"username",40).toLowerCase(),password=str(form,"password",200);
 const user=await db.user.findUnique({where:{username}});
 const matches=user?await bcrypt.compare(password,user.passwordHash):false;
 if(!matches||!user)redirect("/login?erro=credenciais");
 await createSession(user.id);
 redirect(user.role==="MASTER"?"/master":"/admin");
}
export async function signOut(){
 await destroySession();
 redirect("/");
}
