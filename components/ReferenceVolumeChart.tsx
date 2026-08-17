"use client";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyStats } from "@/lib/types";
import { formatNumber } from "@/lib/format";

export function ReferenceVolumeChart({ data }: { data: DailyStats[] }) {
  if (!data.length) return <div className="grid h-[228px] place-items-center text-xs text-wolfie-muted">No daily telemetry available</div>;
  return <div className="p-[14px]"><div className="h-[200px]"><ResponsiveContainer><ComposedChart data={data} margin={{top:5,right:8,bottom:0,left:-18}}><defs><linearGradient id="volumeRef" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0F9F6E" stopOpacity={0.12}/><stop offset="1" stopColor="#0F9F6E" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#E6E9ED" vertical={false}/><XAxis dataKey="day" hide/><YAxis hide/><Tooltip contentStyle={{fontSize:11,border:"1px solid #E3E7EC",borderRadius:8}} formatter={(value:number) => [formatNumber(value),"Rows written"]}/><Area dataKey="rows_written" type="monotone" fill="url(#volumeRef)" stroke="none"/><Line dataKey="rows_written" type="monotone" stroke="#0F9F6E" strokeWidth={3} dot={false}/></ComposedChart></ResponsiveContainer></div></div>;
}
