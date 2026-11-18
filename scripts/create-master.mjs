import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
const username = (process.env.MASTER_USERNAME || "").trim().toLowerCase();
const password = process.env.MASTER_PASSWORD || "";
if (!/^[a-z0-9_.-]{4,40}$/.test(username) || password.length < 12) {
 console.error("Configure MASTER_USERNAME (4-40 caracteres) e MASTER_PASSWORD (12+ caracteres) no ambiente.");
 process.exitCode = 1;
} else {
 const passwordHash = await bcrypt.hash(password, 12);
 await db.user.upsert({where:{username},create:{username,passwordHash,role:"MASTER"},update:{passwordHash,role:"MASTER",shopId:null}});
 console.log("Conta Master criada/atualizada.");
}
await db.$disconnect();
