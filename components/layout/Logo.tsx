export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
  }
  return (
    <div
      className={`${sizes[size]} bg-[#F8EDD9] rounded-lg flex items-center justify-center font-black text-[#307139] flex-shrink-0 select-none`}
    >
      BF
    </div>
  )
}
