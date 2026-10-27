import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import AppShell from "@/components/AppShell";
import ImportForm from "@/components/ImportForm";
export default async function Page(){const id=await getSessionUserId();if(!id)redirect("/login");const user=await db.user.findUnique({where:{id}});if(!user)redirect("/login");return <AppShell active="/dashboard" userName={user.name}><main className="page"><div className="page-head"><div><h1>Importar planilha</h1><p>Traga suas receitas e despesas em lote, com revisão antes de salvar.</p></div></div><ImportForm/></main></AppShell>;}
