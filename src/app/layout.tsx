import type { ReactNode } from "react";
import "./globals.css";
export const metadata={title:"BARBERNEX — A nova era da gestão para barbearias",description:"Agenda online, financeiro, clientes, equipe e seu próprio site de agendamento."};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}
