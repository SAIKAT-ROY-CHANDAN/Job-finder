import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/server-helpers";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const userId = await currentUserId();
  if (userId) redirect("/dashboard");
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-4">
      <RegisterForm />
    </div>
  );
}
