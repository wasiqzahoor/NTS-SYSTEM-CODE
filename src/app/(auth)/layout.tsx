export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 nts-mesh-bg nts-grid-bg">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-nts-cyan/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-nts-blue-magenta/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-nts-cyan/3 blur-[80px]" />
      </div>
      <div className="relative w-full max-w-sm py-8 animate-fade-slide-up">
        {children}
      </div>
    </div>
  );
}
