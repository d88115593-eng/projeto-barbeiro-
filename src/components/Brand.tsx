import Link from "next/link";
export function Brand({href="/"}:{href?:string}){return <Link href={href} className="brand" aria-label="BARBERNEX, início"><span className="brand-mark">B<span className="brand-dot">.</span></span><span>BARBER<span className="accent-text">NEX</span></span></Link>}
