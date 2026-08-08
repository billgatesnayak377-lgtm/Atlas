type DashboardCardProps = {
  children: React.ReactNode;
};

export default function DashboardCard({
  children,
}: DashboardCardProps) {
  return (
    <div className="w-full max-w-2xl rounded-3xl bg-slate-800 shadow-2xl p-8">
      {children}
    </div>
  );
}