import { Search, Sun, CloudSun, Cloud, CloudFog, CloudRain, CloudSnow, CloudLightning, Snowflake } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useBookmarks } from '../context/BookmarkContext';
import { IconResolver } from '../components/IconResolver';
import { getFaviconUrl } from '../utils/getFavicon';

const bgClasses = [
  'bg-secondary-container text-on-secondary-container',
  'bg-tertiary-fixed text-on-tertiary-fixed',
  'bg-primary-fixed text-on-primary-fixed',
  'bg-surface-container-highest text-on-surface-variant'
];

export function Home() {
  const { categories, isLoading } = useBookmarks();
  const [dateInfo, setDateInfo] = useState('');
  const [weather, setWeather] = useState({ city: '定位中...', temp: '', desc: '', Icon: Sun });

  useEffect(() => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    setDateInfo(`${dateStr} ${days[now.getDay()]}`);

    const fetchWeather = async () => {
      try {
        const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
        const geoData = await geoRes.json();
        const city = geoData.city || '未知';
        const lat = geoData.latitude;
        const lon = geoData.longitude;

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const weatherData = await weatherRes.json();
        const temp = Math.round(weatherData.current_weather.temperature);
        const code = weatherData.current_weather.weathercode;
        
        let desc = '晴朗';
        let Icon = Sun;
        
        if (code === 0) { desc = '晴朗'; Icon = Sun; }
        else if (code === 1 || code === 2) { desc = '多云'; Icon = CloudSun; }
        else if (code === 3) { desc = '阴'; Icon = Cloud; }
        else if (code === 45 || code === 48) { desc = '雾'; Icon = CloudFog; }
        else if (code >= 51 && code <= 67) { desc = '雨'; Icon = CloudRain; }
        else if (code >= 71 && code <= 77) { desc = '雪'; Icon = Snowflake; }
        else if (code >= 80 && code <= 82) { desc = '阵雨'; Icon = CloudRain; }
        else if (code >= 85 && code <= 86) { desc = '阵雪'; Icon = Snowflake; }
        else if (code >= 95 && code <= 99) { desc = '雷雨'; Icon = CloudLightning; }

        setWeather({ city, temp: `${temp}°C`, desc, Icon });
      } catch (e) {
        console.error(e);
        setWeather({ city: '获取失败', temp: '', desc: '', Icon: Sun });
      }
    };
    fetchWeather();
  }, []);

  if (isLoading) {
    return (
      <main className="max-w-container-max-width mx-auto px-6 py-12 flex flex-col w-full min-h-[50vh] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-on-surface-variant text-sm font-medium">Loading your dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-container-max-width mx-auto px-6 py-12 flex flex-col w-full">
      <div className="w-full max-w-search-max-width mx-auto mb-16 flex flex-col items-center">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mb-6 text-primary-container font-light">
          <span className="text-sm whitespace-nowrap">{dateInfo}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm">{weather.city}</span>
            <weather.Icon className="w-4 h-4" />
            {weather.temp && <span className="text-sm">{weather.temp}</span>}
            {weather.desc && <span className="text-sm">{weather.desc}</span>}
          </div>
        </div>
        
        <form action="https://www.google.com/search" method="GET" className="relative group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant transition-colors group-focus-within:text-primary" />
          <input 
            type="text" 
            name="q"
            placeholder="Search with Google..."
            className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all card-shadow text-body-lg text-on-surface placeholder:text-on-surface-variant"
          />
        </form>
      </div>

      <section className="w-full space-y-8">
        {categories.map((category, idx) => {
          const bgClass = bgClasses[idx % bgClasses.length];
          return (
          <div key={idx} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-surface-container-highest pb-2">
              <IconResolver name={category.iconName} className="w-5 h-5 text-primary" />
              <h2 className="text-h3 text-on-surface">{category.title}</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {category.items.map((item, idy) => (
                <a 
                  key={idy}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-surface-container-lowest p-3 rounded-lg card-shadow card-hover transition-all duration-200 flex items-center gap-3 border border-transparent hover:border-surface-variant group overflow-hidden"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white shadow-sm border border-outline-variant/30 overflow-hidden`}>
                    <img 
                      src={getFaviconUrl(item.url)} 
                      alt="" 
                      className="w-5 h-5 object-contain rounded-sm"
                      onError={(e) => { e.currentTarget.src = getFaviconUrl('https://example.com'); }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-on-surface mb-0.5 truncate">{item.name}</p>
                    {item.desc && <p className="text-[10px] text-on-surface-variant uppercase tracking-wider truncate">{item.desc}</p>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )})}
        
        <div className="mt-12 rounded-2xl overflow-hidden relative h-[300px] flex items-center justify-center">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxgWKnOF7KAG4tLjtvhFnpbo90x1vy8oB66OmNkTWKBZ52iaOeqanwhlqOROj3_vjUiy8FMfRc8qPlt-E78E3xicgdIc7BiRLanpwEIxbMsVpN4l55qUDGHU7iF3xnfVsscnfEGEuq1q_cG3grZvx5k1KzboQCTlZ1dCagmg6EGzww9v7XH0devnKPQv5VQ90ZpmcnWOgH16qcvTZUGLctQlFSx6oUdGyU_MDBUHynTeDSqgtVqBmlseyWX4rxyk2dSdLKAj2VcUw" 
              alt="Modern minimalist workspace" 
              className="w-full h-full object-cover brightness-[0.4] transition-transform duration-700 hover:scale-105"
            />
          </div>
          <div className="relative z-10 text-center space-y-4 px-6">
            <h1 className="text-display text-white">Focus on what matters.</h1>
            <p className="text-body-lg text-white/80 max-w-lg mx-auto">
              Your digital launchpad for a focused and organized day across the web.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
