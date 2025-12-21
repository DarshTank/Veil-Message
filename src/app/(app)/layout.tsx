// app/dashboard/layout.tsx
// import Navbar from "@/components/Navbar";
// import Sidebar from "@/components/Navbar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <section className="flex">
      {/* <Navbar /> */}
      <main className="flex-grow p-4">{children}</main>
    </section>
  );
}
