function Placeholder({ className = '' }: { className?: string }) {
  return <span className={`dash-loading-block ${className}`} />;
}

export function NavigationSkeleton({ fullPage = false, variant = 'home', label = '正在加载导航…' }: { fullPage?: boolean; variant?: 'home' | 'categories'; label?: string }) {
  const groups = <>{[0, 1, 2].map(group => <div key={group} className="dash-loading-group">
    <Placeholder className="dash-loading-title" />
    <div className="dash-loading-grid">{[0, 1, 2].map(card => <div key={card} className="dash-loading-card"><Placeholder className="dash-loading-icon" /><div><Placeholder /><Placeholder className="dash-loading-detail" /></div></div>)}</div>
  </div>)}</>;
  return <div role="status" aria-busy="true" className={`dash-loading ${fullPage ? 'dash-loading--page' : ''}`}>
    <span className="dash-loading-sr">{label}</span>
    <div aria-hidden="true">
      {fullPage && <div className="dash-loading-nav"><strong>Dash</strong><div><Placeholder className="dash-loading-title" /><Placeholder className="dash-loading-icon" /></div></div>}
      <div className={fullPage ? 'dash-loading-container' : ''}>
        {fullPage && variant === 'home' && <div className="dash-loading-search"><Placeholder className="dash-loading-field" /></div>}
        {variant === 'categories' ? <div className="dash-loading-columns"><div className="dash-loading-sidebar dash-loading-group"><Placeholder className="dash-loading-field" /><Placeholder /><Placeholder /><Placeholder /></div><div className="dash-loading-content">{groups}</div></div> : groups}
      </div>
    </div>
  </div>;
}
