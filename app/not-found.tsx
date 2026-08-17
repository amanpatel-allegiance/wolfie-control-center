import Link from "next/link";
import { SearchX } from "lucide-react";
export default function NotFound() { return <div className="surface empty-panel min-h-[420px]"><div><SearchX className="mx-auto size-7 text-wolfie-muted"/><h1 className="mt-4 text-base font-semibold">Record not found</h1><p className="mt-2 text-xs text-wolfie-muted">This pipeline or run does not exist in the production registry.</p><Link href="/" className="primary-button mt-5">Back to overview</Link></div></div>; }
