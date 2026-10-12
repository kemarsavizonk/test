import Link from "next/link";
import { Logo } from "@/components/logo";
export default function NotFound(){return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,textAlign:"center"}}><div><Logo/><div className="eyebrow" style={{marginTop:45}}>404</div><h1 style={{fontSize:42,letterSpacing:"-.05em",margin:"10px 0"}}>That page took a rest day.</h1><p className="muted" style={{marginBottom:24}}>The route you requested could not be found.</p><Link className="btn btn-primary" href="/">Return home</Link></div></main>}
