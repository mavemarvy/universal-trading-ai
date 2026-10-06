import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export async function GET(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)return NextResponse.json({ok:false,error:"not_configured"},{status:503});const supabase=createClient(url,key,{auth:{persistSession:false}});const {data,error}=await supabase.rpc("api_health");return NextResponse.json(error?{ok:false,error:"supabase_unreachable"}:{ok:true,database:data},{status:error?503:200});}
