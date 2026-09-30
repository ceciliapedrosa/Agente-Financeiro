import ResetPasswordForm from "@/components/ResetPasswordForm";
export default async function ResetPasswordPage({searchParams}:{searchParams:Promise<{token?:string}>}){
  const {token=""}=await searchParams;
  return <main className="auth-page"><div className="auth-backdrop"></div><ResetPasswordForm token={token}/></main>
}
