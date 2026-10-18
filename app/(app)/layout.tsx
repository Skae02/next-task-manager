import { GlobalDialogs } from "@/components/app/dialogs";
import { Toaster } from "@/components/app/toaster";
import { TopBar } from "@/components/app/top-bar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <GlobalDialogs />
      <Toaster />
    </>
  );
}
