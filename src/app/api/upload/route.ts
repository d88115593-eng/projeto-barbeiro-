import { NextRequest,NextResponse } from "next/server";
import {randomUUID} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import {currentUser} from "@/lib/auth";
export const runtime="nodejs";
const mimeToExt:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","video/mp4":"mp4"};
export async function POST(req:NextRequest){
 const user=await currentUser();
 if(!user || user.role!=="OWNER" || !user.shop || user.shop.status!=="ACTIVE" || !user.shop.paidThrough || user.shop.paidThrough<new Date())return NextResponse.json({error:"Acesso não autorizado"},{status:403});
 const form=await req.formData(),file=form.get("file");
 if(!(file instanceof File))return NextResponse.json({error:"Arquivo não enviado"},{status:400});
 const ext=mimeToExt[file.type];
 if(!ext)return NextResponse.json({error:"Apenas JPG, PNG, WEBP ou MP4"},{status:400});
 const max=file.type==="video/mp4"?40*1024*1024:12*1024*1024;
 if(file.size===0||file.size>max)return NextResponse.json({error:"Arquivo excede o limite permitido"},{status:413});
 const name=randomUUID()+"."+ext;
 const base=process.env.UPLOAD_DIR||path.join(process.cwd(),"uploads");
 await mkdir(base,{recursive:true});
 await writeFile(path.join(base,name),Buffer.from(await file.arrayBuffer()),{flag:"wx"});
 return NextResponse.json({url:"/api/media/"+name},{headers:{"Cache-Control":"no-store"}});
}
