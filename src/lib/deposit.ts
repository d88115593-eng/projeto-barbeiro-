/** Regras financeiras aplicadas pelo servidor; todos os valores são centavos. */
export type DepositConfig={depositMode:"DISABLED"|"OPTIONAL"|"REQUIRED";depositPricing:"FIXED"|"PERCENT";depositFixedCents:number;depositPercent:number;depositDeducts:boolean};
export function depositAmount(config:DepositConfig,servicePriceCents:number):number{
 if(!Number.isSafeInteger(servicePriceCents)||servicePriceCents<=0)return 0;
 const cents=config.depositPricing==="PERCENT"?Math.round(servicePriceCents*config.depositPercent/100):config.depositFixedCents;
 return Number.isSafeInteger(cents)?Math.max(0,Math.min(cents,servicePriceCents)):0;
}
export function remainingServiceAmount(servicePriceCents:number,depositCents:number,deducts:boolean):number{
 return deducts?Math.max(0,servicePriceCents-depositCents):servicePriceCents;
}
