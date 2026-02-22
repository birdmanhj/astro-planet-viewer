import { useState, useRef } from 'react';

// SVG 图标：尺寸完全一致，不依赖字体渲染
const IconBack2 = () => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor" style={{ display: 'inline' }}>
    <polygon points="13,1 7,5 13,9" /><polygon points="6,1 0,5 6,9" />
  </svg>
);
const IconBack1 = () => (
  <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" style={{ display: 'inline' }}>
    <polygon points="7,1 1,5 7,9" />
  </svg>
);
const IconFwd1 = () => (
  <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" style={{ display: 'inline' }}>
    <polygon points="1,1 7,5 1,9" />
  </svg>
);
const IconFwd2 = () => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor" style={{ display: 'inline' }}>
    <polygon points="1,1 7,5 1,9" /><polygon points="8,1 14,5 8,9" />
  </svg>
);

const TIME_STEPS = [
  { label: '1小时', ms: 3600000 },
  { label: '1天', ms: 86400000 },
  { label: '1月', ms: 2592000000 },
];

// 分段日期时间输入组件
// 上下键：增减当前段；左右键：切换焦点段
function DateTimeInput({ value, onChange, disabled }) {
  const segRefs = useRef([null, null, null, null, null]);

  const d = value instanceof Date ? value : new Date();
  const segments = [
    { key: 'year',   val: d.getFullYear(),   min: 1,  max: 9999, pad: 4 },
    { key: 'month',  val: d.getMonth() + 1,  min: 1,  max: 12,   pad: 2 },
    { key: 'day',    val: d.getDate(),        min: 1,  max: 31,   pad: 2 },
    { key: 'hour',   val: d.getHours(),       min: 0,  max: 23,   pad: 2 },
    { key: 'minute', val: d.getMinutes(),     min: 0,  max: 59,   pad: 2 },
  ];

  const applyChange = (idx, newVal) => {
    const nd = new Date(d);
    if (idx === 0) nd.setFullYear(newVal);
    else if (idx === 1) { nd.setMonth(newVal - 1); }
    else if (idx === 2) nd.setDate(newVal);
    else if (idx === 3) nd.setHours(newVal);
    else if (idx === 4) nd.setMinutes(newVal);
    onChange(nd);
  };

  const handleKeyDown = (e, idx) => {
    if (disabled) return;
    const seg = segments[idx];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      applyChange(idx, seg.val >= seg.max ? seg.min : seg.val + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      applyChange(idx, seg.val <= seg.min ? seg.max : seg.val - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (idx < 4) segRefs.current[idx + 1]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (idx > 0) segRefs.current[idx - 1]?.focus();
    }
  };

  const SEP = ['−', '−', ' ', ':'];

  return (
    <div
      className={`flex items-center bg-gray-800 rounded px-2 py-1.5 text-xs font-mono ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {segments.map((seg, idx) => (
        <span key={seg.key} className="flex items-center">
          <span
            ref={el => { segRefs.current[idx] = el; }}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={e => handleKeyDown(e, idx)}
            className="outline-none focus:bg-blue-700 rounded px-0.5 cursor-default select-none text-white"
          >
            {String(seg.val).padStart(seg.pad, '0')}
          </span>
          {idx < 4 && (
            <span className="text-gray-500 select-none px-px">{SEP[idx]}</span>
          )}
        </span>
      ))}
    </div>
  );
}

export default function ControlPanel({
  mode, onModeChange,
  time, onTimeChange,
  location, onLocationChange,
  activeView, onViewChange,
  phenomena,
  locationStatus, onRequestLocation,
  isMobile, isOpen, onToggle,
}) {
  const [step, setStep] = useState(1);
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);

  const stepMs = TIME_STEPS[step].ms;

  const formatTime = (d) => {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleLocationSubmit = () => {
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      onLocationChange({ latitude: lat, longitude: lng, elevation: 50, name: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°` });
      setShowLocationInput(false);
    }
  };

  const btnCls = 'flex-1 bg-gray-700 hover:bg-gray-600 rounded py-1 text-sm leading-none disabled:opacity-40';

  const content = (
    <div className="flex flex-col gap-4 p-4 text-sm text-gray-200">
      {/* 工作模式 */}
      <div>
        <div className="text-xs text-gray-400 mb-1">工作模式</div>
        <div className="flex gap-2">
          <button
            onClick={() => onModeChange('local')}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
              mode === 'local' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            本地模式
          </button>
          <button
            onClick={() => onModeChange('custom')}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
              mode === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            指定模式
          </button>
        </div>
      </div>

      {/* 观测位置 */}
      <div>
        <div className="text-xs text-gray-400 mb-1">观测位置</div>
        <div className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1.5">
          <span className="text-blue-400">📍</span>
          <span className="flex-1 truncate text-xs">{location?.name || '未知位置'}</span>
          {mode === 'local' ? (
            <button
              onClick={onRequestLocation}
              className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
            >
              {locationStatus === 'loading' ? '定位中...' : '重新定位'}
            </button>
          ) : (
            <button
              onClick={() => setShowLocationInput(!showLocationInput)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              更改
            </button>
          )}
        </div>
        {locationStatus === 'denied' && (
          <div className="text-xs text-yellow-400 mt-1">定位被拒绝，请手动输入位置</div>
        )}
        {showLocationInput && mode === 'custom' && (
          <div className="mt-2 flex flex-col gap-1">
            <input
              type="number" placeholder="纬度 (如 39.9)"
              value={customLat} onChange={e => setCustomLat(e.target.value)}
              className="bg-gray-700 rounded px-2 py-1 text-xs text-white outline-none"
            />
            <input
              type="number" placeholder="经度 (如 116.4)"
              value={customLng} onChange={e => setCustomLng(e.target.value)}
              className="bg-gray-700 rounded px-2 py-1 text-xs text-white outline-none"
            />
            <button
              onClick={handleLocationSubmit}
              className="bg-blue-600 hover:bg-blue-500 rounded py-1 text-xs text-white"
            >
              确认
            </button>
          </div>
        )}
      </div>

      {/* 观测时间 */}
      <div>
        <div className="text-xs text-gray-400 mb-1">观测时间</div>
        <DateTimeInput value={time} onChange={onTimeChange} disabled={mode === 'local'} />
        <div className="flex gap-1 mt-2">
          <button onClick={() => onTimeChange(new Date(time.getTime() - stepMs * 10))}
            className={btnCls} disabled={mode === 'local'}><IconBack2 /></button>
          <button onClick={() => onTimeChange(new Date(time.getTime() - stepMs))}
            className={btnCls} disabled={mode === 'local'}><IconBack1 /></button>
          <button onClick={() => onTimeChange(new Date())}
            className="flex-1 bg-gray-700 hover:bg-gray-600 rounded py-1 text-xs">现在</button>
          <button onClick={() => onTimeChange(new Date(time.getTime() + stepMs))}
            className={btnCls} disabled={mode === 'local'}><IconFwd1 /></button>
          <button onClick={() => onTimeChange(new Date(time.getTime() + stepMs * 10))}
            className={btnCls} disabled={mode === 'local'}><IconFwd2 /></button>
        </div>
        <div className="flex gap-1 mt-1">
          {TIME_STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`flex-1 py-0.5 rounded text-xs transition-colors ${
                step === i ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 视角切换 */}
      <div>
        <div className="text-xs text-gray-400 mb-1">显示视角</div>
        <div className="flex gap-2">
          <button
            onClick={() => onViewChange('solar')}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
              activeView === 'solar' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🪐 太阳系
          </button>
          <button
            onClick={() => onViewChange('sky')}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
              activeView === 'sky' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ✨ 天空
          </button>
        </div>
      </div>

      {/* 特殊天象 */}
      {phenomena?.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-1">当前天象</div>
          <div className="flex flex-col gap-1">
            {phenomena.map((p, i) => (
              <div key={i} className="bg-yellow-900/40 border border-yellow-700/50 rounded px-2 py-1 text-xs text-yellow-300">
                ✨ {p.description}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // 移动端：底部抽屉
  if (isMobile) {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-30 transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-48px)]'}`}>
        <div className="bg-gray-900/95 backdrop-blur border-t border-gray-700 rounded-t-2xl">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center py-3 text-gray-400"
          >
            <div className="w-10 h-1 bg-gray-600 rounded-full" />
          </button>
          <div className="max-h-[60vh] overflow-y-auto">
            {content}
          </div>
        </div>
      </div>
    );
  }

  // 桌面端：侧边栏
  return (
    <div className="w-64 bg-gray-900/90 backdrop-blur border-r border-gray-800 overflow-y-auto flex-shrink-0">
      <div className="px-4 py-3 border-b border-gray-800">
        <h1 className="text-base font-bold text-white">🌌 天文观测台</h1>
        <div className="text-xs text-gray-500 mt-0.5">{formatTime(time)}</div>
      </div>
      {content}
    </div>
  );
}
