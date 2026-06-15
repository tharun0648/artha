interface LoadingVerdictProps {
  dots?: string
}

export default function LoadingVerdict({ dots = '.' }: LoadingVerdictProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', textAlign: 'center' }}>
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--brand-surface)',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '2px solid var(--brand)',
            borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
          }}
          className="animate-spin"
        />
      </div>
      <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
        Building your Financial Twin{dots}
      </p>
      <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
        Running causal attribution analysis on your financial data.
      </p>
    </div>
  )
}
