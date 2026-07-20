// app/dashboard/layout.tsx
// import Navbar from "@/components/Navbar";
// import Sidebar from "@/components/Navbar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <section className="flex w-full">
      {/* <Navbar /> */}
      <main className="flex-grow w-full">{children}</main>
    </section>
  );
}
