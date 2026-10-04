import Image from "next/image";
import { Link } from "@/i18n/navigation";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Link href="/dashboard" className="transition-opacity hover:opacity-80">
        {/* Both rendered; the `dark` class on <html> decides which is visible, so no JS theme lookup is needed. */}
        <Image
          src="/logo/academy-fi/logo-light.png"
          alt="Academy Fi"
          width={200}
          height={200}
          priority
          className="dark:hidden"
        />
        <Image
          src="/logo/academy-fi/logo-dark.png"
          alt="Academy Fi"
          width={200}
          height={200}
          priority
          className="hidden dark:block"
        />
      </Link>
    </div>
  );
}
