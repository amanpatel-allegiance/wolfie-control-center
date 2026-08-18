"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function AutoRefreshButton(){const router=useRouter();const [enabled,setEnabled]=useState(true);useEffect(()=>{if(!enabled)return;const timer=window.setInterval(()=>router.refresh(),30_000);return()=>window.clearInterval(timer)},[enabled,router]);return <button type="button" className="ref-btn" aria-pressed={enabled} onClick={()=>setEnabled((value)=>!value)}><RefreshCw className={enabled?"text-wolfie-accent":"opacity-45"}/>Auto refresh · {enabled?"30s":"Off"}</button>}
