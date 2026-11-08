import { BrandLogo } from "@/components/app/brand-logo";
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-fg">
        <BrandLogo />
      </div>
      <div className="w-full max-w-[400px] rounded-2xl border border-line bg-surface p-7 shadow-card">
        {children}
      </div>
    </main>
  );
}
