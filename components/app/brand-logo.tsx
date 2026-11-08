"use client";

import Image from "next/image";
import { useIsDark } from "@/utils/use-theme";
import lightLogo from "@/assets/ST_NAVBAR_LOGO.webp";
import darkLogo from "@/assets/ST_NAVBAR_LOGO_DARK.webp";

export function BrandLogo() {
  const dark = useIsDark();
  return <Image src={dark ? darkLogo : lightLogo} width={120} height={40} alt="SimpleTaskly" />;
}
