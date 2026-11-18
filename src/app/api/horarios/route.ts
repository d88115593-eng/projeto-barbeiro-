import { NextRequest,NextResponse } from "next/server";
import {db} from "@/lib/db";
import {getAvailableSlots} from "@/lib/availability";
export async function GET(request:NextRequest){
 const url=request.nextUrl.searchParams;
 const slug=(url.get("slug")||"").slice(0,40),professionalId=(url.get("professionalId")||"").slice(0,100),serviceId=(url.get("serviceId")||"").slice(0,100),date=(url.get("date")||"").slice(0,10);
 const shop=await db.barbershop.findUnique({where:{slug}});
 if(!shop)return NextResponse.json({slots:[]},{status:404});
 const slots=await getAvailableSlots(shop.id,professionalId,serviceId,date);
 return NextResponse.json({slots:slots.map(s=>s.label)},{headers:{"Cache-Control":"no-store"}});
}
