import { useState } from 'react';

const TIME_STEPS = [
  { label: '1小时', ms: 3600000 },
  { label: '1天', ms: 86400000 },
  { label: '1月', ms: 2592000000 },
];

export default function ControlPanel({
  mode, onModeChange,
  time, onTimeChange,
  location, onLocationChange,
  activeView, onViewChange,
  phenomena,
  locationStatus, onRequestLocation,
  isMobile, isOpen, onToggle,
}) {
  const [step, setStep] = useState(1); // 0=1h, 1=1d, 2=1m
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);

  const stepMs = TIME_STEPS[step].ms;

  const formatTime = (d) => {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const toInputValue = (d) => {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleTimeInput = (e) => {
    const d = new Date(e.target.value);
    if (!isNaN(d)) onTimeChange(d);
  };

  const handleLocationSubmit = () => {
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      onLocationChange({ latitude: lat, longitude: lng, elevation: 50, name: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°` });
      setShowLocationInput(false);
    }
  };

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
        <input
          type="datetime-local"
          value={toInputValue(time)}
          onChange={handleTimeInput}
          disabled={mode === 'local'}
          className="w-full bg-gray-800 rounded px-2 py-1.5 text-xs text-white outline-none disabled:opacity-50"
        />
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => onTimeChange(new Date(time.getTime() - stepMs * 10))}
            className="flex-1 bg-gray-700 hover:bg-gray-600 rounded py-1 text-xs"
            disabled={mode === 'local'}
          >◄◄</button>
          <button
            onClick={() => onTimeChange(new Date(time.getTime() - stepMs))}
            className="flex-1 bg-gray-700 hover:bg-gray-600 rounded py-1 text-xs"
            disabled={mode === 'local'}
          >◄</button>
          <button
            onClick={() => onTimeChange(new Date())}
            className="flex-1 bg-gray-700 hover:bg-gray-600 rounded py-1 text-xs"
          >现在</button>
          <button
            onClick={() => onTimeChange(new Date(time.getTime() + stepMs))}
            className="flex-1 bg-gray-700 hover:bg-gray-600 rounded py-1 text-xs"
            disabled={mode === 'local'}
          >►</button>
          <button
            onClick={() => onTimeChange(new Date(time.getTime() + stepMs * 10))}
            className="flex-1 bg-gray-700 hover:bg-gray-600 rounded py-1 text-xs"
            disabled={mode === 'local'}
          >►►</button>
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
