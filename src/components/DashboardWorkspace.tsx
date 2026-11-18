"use client";
import {useEffect} from "react";
export function DashboardWorkspace({homeId}:{homeId:string}){
 useEffect(()=>{
  const main=document.querySelector<HTMLElement>(".dash-main"),side=document.querySelector<HTMLElement>(".dash-aside");
  if(!main||!side)return;
  const links=Array.from(side.querySelectorAll<HTMLAnchorElement>(".side-links a[href^='#']"));
  const choices=new Set([homeId,...links.map(link=>link.hash.slice(1))]);
  function render(){const hash=decodeURIComponent(window.location.hash.slice(1));const active=choices.has(hash)?hash:homeId;
   for(const section of Array.from(main!.querySelectorAll<HTMLElement>(":scope > section[id]"))){section.hidden=section.id!==active;section.classList.toggle("workspace-hidden",section.id!==active)}
   for(const el of Array.from(main!.querySelectorAll<HTMLElement>(".overview-only"))){el.classList.toggle("workspace-hidden",active!==homeId)}
   for(const link of links){const selected=link.hash.slice(1)===active;link.classList.toggle("selected",selected);if(selected)link.setAttribute("aria-current","page");else link.removeAttribute("aria-current")}
   main!.dataset.workspaceReady="true";
  }
  function navigate(e:MouseEvent){const target=e.target as HTMLElement|null;const anchor=target?.closest?.('a[href^="#"]') as HTMLAnchorElement|null;
   if(!anchor||!choices.has(anchor.hash.slice(1)))return;
   // Let the browser update the hash normally; reveal the selected module immediately.
   window.requestAnimationFrame(()=>{render();main?.scrollIntoView({behavior:"smooth",block:"start"})});
  }
  window.addEventListener("hashchange",render);document.addEventListener("click",navigate);render();
  return()=>{window.removeEventListener("hashchange",render);document.removeEventListener("click",navigate)};
 },[homeId]);return null;
}
