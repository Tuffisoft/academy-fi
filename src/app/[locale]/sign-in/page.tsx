import { SignInPanel } from "@/components/auth/sign-in-panel";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ destination?: string | string[] }> }) {
  const { destination } = await searchParams;
  return <SignInPanel destination={destination === "stempelfi" ? "stempelfi" : undefined} />;
}
