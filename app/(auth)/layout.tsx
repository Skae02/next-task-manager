import { BoardIcon } from "@/components/icons";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-2 text-fg">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white shadow-sm">
          <BoardIcon size={18} />
        </span>
        <span className="text-[17px] font-semibold tracking-tight">Tasks</span>
      </div>
      <div className="w-full max-w-[400px] rounded-2xl border border-line bg-surface p-7 shadow-card">
        {children}
      </div>
    </main>
  );
}
