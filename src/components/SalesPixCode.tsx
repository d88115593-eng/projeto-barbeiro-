"use client";
import {useEffect,useState} from "react";
import QRCode from "qrcode";
export function SalesPixCode({code,recipient}:{code:string;recipient:string}){
 const [qr,setQr]=useState(""),[copied,setCopied]=useState(false);
 useEffect(()=>{let mounted=true;QRCode.toDataURL(code,{width:240,margin:2,errorCorrectionLevel:"M"}).then(url=>{if(mounted)setQr(url)}).catch(()=>{});return()=>{mounted=false}},[code]);
 return <div className="sales-pix-box"><strong>Recebedor: {recipient}</strong>{qr&&<img src={qr} alt="QR Code Pix para assinatura BARBERNEX" width={240} height={240}/>}<label>Pix Copia e Cola<textarea value={code} readOnly rows={4}/></label><button className="button button-sm" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(code);setCopied(true)}catch{setCopied(false)}}}>{copied?"Código copiado":"Copiar código Pix"}</button></div>;
}