interface LoadingVerdictProps {
  dots?: string
}

export default function LoadingVerdict({ dots = '.' }: LoadingVerdictProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: 'var(--brand-soft)' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}
        />
      </div>
      <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        Building your Financial Twin{dots}
      </h2>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Running causal attribution analysis on your financial data.
      </p>
    </div>
  )
}
