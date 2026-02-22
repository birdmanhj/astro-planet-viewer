export default function InfoPanel({ body, onClose }) {
  if (!body) return null;

  const formatDeg = (v) => v != null ? `${v.toFixed(2)}°` : '—';
  const formatAU = (v) => v != null ? `${v.toFixed(4)} AU` : '—';
  const formatMag = (v) => v != null ? v.toFixed(1) : '—';
  const formatRA = (deg) => {
    if (deg == null) return '—';
    const h = Math.floor(deg / 15);
    const m = Math.floor((deg % 15) * 4);
    const s = Math.floor(((deg % 15) * 4 - m) * 60);
    return `${h}h ${m}m ${s}s`;
  };

  const altColor = body.altitude >= 0 ? 'text-green-400' : 'text-red-400';
  const altLabel = body.altitude >= 0 ? '地平线以上' : '地平线以下';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <div
        className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800"
          style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)' }}>
          <div>
            <div className="text-lg font-bold text-white">{body.nameZh}</div>
            <div className="text-xs text-gray-400">{body.id}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* 数据 */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <DataItem label="高度角" value={formatDeg(body.altitude)} extra={<span className={`text-xs ${altColor}`}>{altLabel}</span>} />
          <DataItem label="方位角" value={formatDeg(body.azimuth)} />
          <DataItem label="赤经" value={formatRA(body.ra)} />
          <DataItem label="赤纬" value={formatDeg(body.dec)} />
          <DataItem label="距地球" value={formatAU(body.distanceAU)} />
          {body.helioDistAU > 0 && body.id !== 'Sun' && (
            <DataItem label="距太阳" value={formatAU(body.helioDistAU)} />
          )}
          <DataItem label="视星等" value={formatMag(body.magnitude)} />
          {body.constellation && (
            <DataItem label="所在星座" value={body.constellation} />
          )}
        </div>

        {/* 可见性提示 */}
        <div className={`mx-4 mb-4 px-3 py-2 rounded-lg text-xs ${
          body.altitude >= 0 ? 'bg-green-900/40 text-green-300 border border-green-800/50' : 'bg-red-900/40 text-red-300 border border-red-800/50'
        }`}>
          {body.altitude >= 0
            ? `当前可见，高度角 ${body.altitude.toFixed(1)}°`
            : `当前不可见，位于地平线以下 ${Math.abs(body.altitude).toFixed(1)}°`
          }
        </div>
      </div>
    </div>
  );
}

function DataItem({ label, value, extra }) {
  return (
    <div className="bg-gray-800/60 rounded-lg px-3 py-2">
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className="text-sm font-mono text-white">{value}</div>
      {extra && <div className="mt-0.5">{extra}</div>}
    </div>
  );
}
