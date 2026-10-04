"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { Link } from "@/i18n/navigation";

export default function Home() {
  const { theme } = useTheme();

  const logoSrc =
    theme === "dark"
      ? "/logo/academy-fi/logo-dark.png"
      : "/logo/academy-fi/logo-light.png";

  return (
    <div className="flex flex-1 items-center justify-center">
      <Link href="/dashboard" className="transition-opacity hover:opacity-80">
        <Image
          src={logoSrc}
          alt="Academy Fi"
          width={200}
          height={200}
          priority
        />
      </Link>
    </div>
  );
}
