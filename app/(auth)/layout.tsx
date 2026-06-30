export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
      {children}
    </div>
  )
}
