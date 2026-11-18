/** Catálogo inicial editável. Imagens são adicionadas pelo proprietário e nunca sobrescritas. */
export const DEFAULT_SERVICES = [
 ["Corte Zero/Um",1700],
 ["Corte na Maquina",2000],
 ["Corte Navalhado",2500],
 ["Barba",1000],
 ["Corte na Tesoura",2500],
 ["Sobrancelha",700],
 ["Pigmentação em ambos(Cabelo e Barba)",1000],
 ["Pezinho",1000],
 ["Corte Navalhado+Tesoura",3500],
 ["Corte Navalhado+Barba",3000],
 ["Corte na Máquina+Barba",2800],
 ["Corte+Pigmentação",3000],
 ["Corte+sobrancelha",2800],
 ["Corte na Máquina+Tesoura",2800],
 ["Corte+Barba, Sobrancelha GRÁTIS",3000],
 ["Nevou",8000],
 ["Luzes/Reflexo",7000],
] as const;
export const initialServices = DEFAULT_SERVICES.map(([name,priceCents])=>({name,priceCents,durationMinutes:30,imageUrl:"",description:"",active:true}));
