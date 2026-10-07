"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export async function updateProfile(formData:FormData){
  const {supabase,userId}=await requireUser();
  const displayName=String(formData.get("display_name")||"").trim().slice(0,80);
  const experienceLevel=String(formData.get("experience_level")||"").trim().slice(0,40);
  const beginnerMode=formData.get("beginner_mode")==="on";
  await Promise.all([
    supabase.from("profiles").update({display_name:displayName||null,experience_level:experienceLevel||null}).eq("id",userId),
    supabase.from("user_settings").update({beginner_mode:beginnerMode}).eq("user_id",userId)
  ]);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile?updated=1");
}

export async function logout(){
  const {supabase}=await requireUser();
  await supabase.auth.signOut();
  redirect("/");
}
