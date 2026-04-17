// Champ de saisie réutilisable
export default function Input({
  label,
  error,
  className = '',
  type = 'text',
  as: Tag = 'input',
  ...props
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-300">{label}</label>
      )}
      <Tag
        type={Tag === 'input' ? type : undefined}
        className={`
          bg-slate-900 border rounded-xl text-white px-3 py-2 w-full
          focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none
          placeholder-slate-500 transition-all duration-150
          ${error ? 'border-red-500' : 'border-slate-600'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
