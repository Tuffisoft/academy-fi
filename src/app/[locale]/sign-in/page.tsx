import { SignInPanel } from "@/components/auth/sign-in-panel";
import { parseSignInDestination } from "@/lib/loyalty/invitation-link";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string | string[] }>;
}) {
  const { destination } = await searchParams;
  return <SignInPanel destination={parseSignInDestination(destination)} />;
}
