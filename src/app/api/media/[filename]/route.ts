import {readFile} from "node:fs/promises";
import path from "node:path";
import {NextResponse} from "next/server";
export const runtime="nodejs";
const contentTypes:Record<string,string>={jpg:"image/jpeg",png:"image/png",webp:"image/webp",mp4:"video/mp4"};
export async function GET(_:Request,{params}:{params:Promise<{filename:string}>}){
 const {filename}=await params;
 if(!/^[a-f0-9-]{36}\.(jpg|png|webp|mp4)$/.test(filename))return new NextResponse("Not found",{status:404});
 try{
  const data=await readFile(path.join(process.env.UPLOAD_DIR||path.join(process.cwd(),"uploads"),filename));
  const ext=filename.split(".").at(-1)!;
  return new NextResponse(new Uint8Array(data),{headers:{"Content-Type":contentTypes[ext],"Cache-Control":"public,max-age=3600","X-Content-Type-Options":"nosniff"}});
 }catch{return new NextResponse("Not found",{status:404});}
}
