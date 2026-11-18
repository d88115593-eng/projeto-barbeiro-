"use server";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {createSession,destroySession} from "@/lib/auth";
import {str,onlyDigits} from "@/lib/format";
export async function register(form:FormData){
 const username=str(form,"username",40).toLowerCase(),name=str(form,"name",70),slug=str(form,"slug",40).toLowerCase(),password=str(form,"password",200);
 const fullName=str(form,"fullName",120),email=str(form,"email",160).toLowerCase(),phone=onlyDigits(str(form,"phone",24));
 if(!/^[a-z0-9_.-]{4,40}$/.test(username) || !/^[a-z0-9-]{3,40}$/.test(slug)|| name.length<3 || password.length<10 || fullName.length<5 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length<10 || phone.length>13) redirect("/cadastro?erro=dados");
 const exists=await db.user.findUnique({where:{username}});
 const shopExists=await db.barbershop.findUnique({where:{slug}});
 if(exists||shopExists)redirect("/cadastro?erro=existente");
 const passwordHash=await bcrypt.hash(password,12);
 await db.barbershop.create({data:{name,slug,users:{create:{username,passwordHash,role:"OWNER",fullName,email,phone}}}});
 redirect("/login?cadastro=realizado");
}
export async function signIn(form:FormData){
 const username=str(form,"username",40).toLowerCase(),password=str(form,"password",200);
 const user=await db.user.findUnique({where:{username}});
 const matches=user?await bcrypt.compare(password,user.passwordHash):false;
 if(!matches||!user||user.role!=="OWNER")redirect("/login?erro=credenciais");
 await createSession(user.id);
 if(user.mustChangePassword)redirect("/alterar-senha");
 redirect("/admin");
}
export async function signOut(){
 await destroySession();
 redirect("/");
}

export async function signInMaster(form:FormData){
 const username=str(form,"username",40).toLowerCase(),password=str(form,"password",200);
 const user=await db.user.findUnique({where:{username}});
 const matches=user&&user.role==="MASTER"?await bcrypt.compare(password,user.passwordHash):false;
 if(!matches||!user)redirect("/master/login?erro=credenciais");
 await createSession(user.id,true);
 redirect("/master");
}
export async function signOutMaster(){
 await destroySession(true);
 redirect("/master/login");
}

export async function changeOwnPassword(form:FormData){
 const {currentUser}=await import("@/lib/auth");
 const user=await currentUser();
 if(!user||user.role!=="OWNER")redirect("/login");
 const password=str(form,"password",200),confirm=str(form,"confirm",200);
 if(password.length<12||password!==confirm)redirect("/alterar-senha?erro=dados");
 if(!user.mustChangePassword){const oldPassword=str(form,"oldPassword",200);
  const ok=await bcrypt.compare(oldPassword,user.passwordHash);
  if(!ok)redirect("/alterar-senha?erro=atual");
 }
 const passwordHash=await bcrypt.hash(password,12);
 await db.$transaction([db.user.update({where:{id:user.id},data:{passwordHash,mustChangePassword:false}}),db.session.deleteMany({where:{userId:user.id}})]);
 redirect("/login?senha=alterada");
}

export async function updateOwnerContact(form:FormData){
 const {requireOwner}=await import("@/lib/auth");
 const {user}=await requireOwner();
 const fullName=str(form,"fullName",120),email=str(form,"email",160).toLowerCase(),phone=str(form,"phone",22).replace(/\D/g,"");
 if(fullName.length<5||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||phone.length<10||phone.length>13)return;
 await db.user.update({where:{id:user.id},data:{fullName,email,phone}});
 const {revalidatePath}=await import("next/cache");
 revalidatePath("/admin");revalidatePath("/master");
}
