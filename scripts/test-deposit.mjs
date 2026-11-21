import test from "node:test";
import assert from "node:assert/strict";
import {depositAmount,remainingServiceAmount} from "../src/lib/deposit.ts";
const basic={depositMode:"REQUIRED",depositPricing:"FIXED",depositFixedCents:1000,depositPercent:30,depositDeducts:true};
test("sinal fixo sem arredondamento de moeda",()=>{
 assert.equal(depositAmount(basic,3500),1000);
 assert.equal(remainingServiceAmount(3500,1000,true),2500);
});
test("sinal percentual arredondado em centavos",()=>{
 assert.equal(depositAmount({...basic,depositPricing:"PERCENT"},3333),1000);
 assert.equal(remainingServiceAmount(3333,1000,true),2333);
});
test("sinal nao excede o preco do servico",()=>{
 assert.equal(depositAmount({...basic,depositFixedCents:50000},1200),1200);
 assert.equal(remainingServiceAmount(1200,1200,true),0);
});
test("taxa adicional nao abate o servico",()=>{
 assert.equal(remainingServiceAmount(3500,1000,false),3500);
});
test("rejeita valores invalidos",()=>{
 assert.equal(depositAmount(basic,0),0);
 assert.equal(depositAmount({...basic,depositFixedCents:NaN},3500),0);
});
