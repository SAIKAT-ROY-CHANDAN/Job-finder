import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/server-helpers";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const userId = await currentUserId();
  if (userId) redirect("/dashboard");
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-4">
      <LoginForm />
    </div>
  );
}
