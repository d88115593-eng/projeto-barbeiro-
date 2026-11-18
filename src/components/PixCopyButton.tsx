"use client";
import {useState} from "react";
export function PixCopyButton({code}:{code:string}){const [copied,setCopied]=useState(false);return <div className="pix-copy"><textarea readOnly rows={3} value={code} aria-label="Pix Copia e Cola"/><button className="button full" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(code);setCopied(true)}catch{setCopied(false)}}}>{copied?"Código copiado!":"Copiar código Pix"}</button></div>}
