import { useState, useEffect } from 'react';
import SolarSystemView from './components/SolarSystemView';
import SkyView from './components/SkyView';
import ControlPanel from './components/ControlPanel';
import InfoPanel from './components/InfoPanel';
import { useAstronomy } from './hooks/useAstronomy';
import { useGeolocation } from './hooks/useGeolocation';

const DEFAULT_LOCATION = {
  latitude: 39.9042,
  longitude: 116.4074,
  elevation: 50,
  name: '北京',
};

export default function App() {
  const [mode, setMode] = useState('local');
  const [time, setTime] = useState(new Date());
  const [customLocation, setCustomLocation] = useState(DEFAULT_LOCATION);
  const [activeView, setActiveView] = useState('solar');
  const [selectedBodyId, setSelectedBodyId] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [renderMode, setRenderMode] = useState('texture'); // 新增：渲染模式，默认真实模式

  const { location: geoLocation, status: geoStatus, requestLocation } = useGeolocation();

  const location = mode === 'local' ? (geoLocation || DEFAULT_LOCATION) : customLocation;

  useEffect(() => {
    if (mode !== 'local') return;
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    if (mode === 'local') requestLocation();
  }, [mode]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { planets, sun, moon, phenomena } = useAstronomy(time, location);

  console.log('App: Astronomy data', {
    planetsCount: planets?.length,
    hasSun: !!sun,
    hasMoon: !!moon,
    location: location?.name,
    time: time?.toISOString()
  });

  const selectedBody = selectedBodyId
    ? [...(planets || []), sun, moon].find(b => b?.id === selectedBodyId)
    : null;

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (newMode === 'custom') setTime(new Date());
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-white">
      {!isMobile && (
        <ControlPanel
          mode={mode} onModeChange={handleModeChange}
          time={time} onTimeChange={setTime}
          location={location} onLocationChange={setCustomLocation}
          activeView={activeView} onViewChange={setActiveView}
          phenomena={phenomena}
          locationStatus={geoStatus} onRequestLocation={requestLocation}
          isMobile={false}
          renderMode={renderMode} onRenderModeChange={setRenderMode}
        />
      )}

      <div className="flex-1 relative overflow-hidden">
        {isMobile && (
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-3 py-2 bg-gray-900/80 backdrop-blur">
            <button
              onClick={() => setActiveView('solar')}
              className={`flex-1 py-1.5 rounded text-xs font-medium ${activeView === 'solar' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300'}`}
            >
              🪐 太阳系
            </button>
            <button
              onClick={() => setActiveView('sky')}
              className={`flex-1 py-1.5 rounded text-xs font-medium ${activeView === 'sky' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300'}`}
            >
              ✨ 天空
            </button>
            <div className="text-xs text-gray-400 px-1">📍{location?.name?.split(',')[0] || '—'}</div>
          </div>
        )}

        {phenomena?.length > 0 && (
          <div className="absolute left-0 right-0 z-10 flex justify-center pointer-events-none"
            style={{ top: isMobile ? '44px' : '8px' }}>
            <div className="mt-2 px-4 py-1.5 bg-yellow-900/80 border border-yellow-700/60 rounded-full text-xs text-yellow-300 backdrop-blur">
              ✨ {phenomena[0].description}
              {phenomena.length > 1 && ` 等 ${phenomena.length} 个天象`}
            </div>
          </div>
        )}

        <div className="w-full h-full">
          {activeView === 'solar' ? (
            <SolarSystemView
              planets={planets}
              sun={sun}
              moon={moon}
              selectedBody={selectedBodyId}
              onSelectBody={setSelectedBodyId}
              renderMode={renderMode}
            />
          ) : (
            <SkyView
              planets={planets}
              sun={sun}
              moon={moon}
              location={location}
              time={time}
              selectedBody={selectedBodyId}
              onSelectBody={setSelectedBodyId}
            />
          )}
        </div>

        {!isMobile && (
          <div className="absolute top-3 right-3 flex gap-2 z-10">
            <button
              onClick={() => setActiveView('solar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur transition-colors ${
                activeView === 'solar' ? 'bg-indigo-600 text-white' : 'bg-gray-900/70 text-gray-300 hover:bg-gray-800/70'
              }`}
            >
              🪐 太阳系视角
            </button>
            <button
              onClick={() => setActiveView('sky')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur transition-colors ${
                activeView === 'sky' ? 'bg-indigo-600 text-white' : 'bg-gray-900/70 text-gray-300 hover:bg-gray-800/70'
              }`}
            >
              ✨ 天空视角
            </button>
          </div>
        )}
      </div>

      {isMobile && (
        <ControlPanel
          mode={mode} onModeChange={handleModeChange}
          time={time} onTimeChange={setTime}
          location={location} onLocationChange={setCustomLocation}
          activeView={activeView} onViewChange={setActiveView}
          phenomena={phenomena}
          locationStatus={geoStatus} onRequestLocation={requestLocation}
          isMobile={true} isOpen={isPanelOpen} onToggle={() => setIsPanelOpen(!isPanelOpen)}
          renderMode={renderMode} onRenderModeChange={setRenderMode}
        />
      )}

      {selectedBody && (
        <InfoPanel body={selectedBody} onClose={() => setSelectedBodyId(null)} />
      )}
    </div>
  );
}
