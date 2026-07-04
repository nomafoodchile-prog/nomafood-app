export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
  }
  return (
    <div
      className={`${sizes[size]} bg-[#c9a24e] rounded-lg flex items-center justify-center font-black text-[#1b2a4a] flex-shrink-0 select-none`}
    >
      NF
    </div>
  )
}
