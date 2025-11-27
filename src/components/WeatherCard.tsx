import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface CurrentWeather {
  temp_c: number;
  condition: {
    text: string;
    icon: string;
  };
}

interface ForecastDay {
  date: string;
  day: {
    maxtemp_c: number;
    condition: {
      text: string;
      icon: string;
    };
  };
}

interface WeatherData {
  current: CurrentWeather;
  forecast: {
    forecastday: ForecastDay[];
  };
}

export default function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const API_KEY = '6315ad5252f243a1b15125820251408';
  const SALVADOR_QUERY = 'Salvador,Bahia,Brazil';

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(false);
      
      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${SALVADOR_QUERY}&days=5&lang=pt`
      );
      
      if (!response.ok) {
        throw new Error('Weather API request failed');
      }
      
      const data = await response.json();
      setWeather(data);
    } catch (error) {
      console.error('Error fetching weather:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    
    // Atualizar a cada 1 hora (60 minutos)
    const interval = setInterval(fetchWeather, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[date.getDay()];
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Clima - Salvador</p>
            <Skeleton className="h-6 w-24 mt-1" />
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <i className="fas fa-cloud-sun text-primary text-xl"></i>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Clima - Salvador</p>
            <p className="text-2xl font-bold text-foreground">--°C</p>
          </div>
          <div className="w-12 h-12 bg-muted/20 rounded-lg flex items-center justify-center">
            <i className="fas fa-cloud-exclamation text-muted-foreground text-xl"></i>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Clima indisponível no momento</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Clima - Salvador</p>
          <div className="flex items-center gap-2 mt-1">
            <img 
              src={`https:${weather.current.condition.icon}`}
              alt={weather.current.condition.text}
              className="w-8 h-8"
            />
            <p className="text-2xl font-bold text-foreground">
              {Math.round(weather.current.temp_c)}°C
            </p>
          </div>
        </div>
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <i className="fas fa-cloud-sun text-primary text-xl"></i>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
        {weather.forecast.forecastday.slice(1, 5).map((day) => (
          <div key={day.date} className="text-center">
            <p className="text-xs text-muted-foreground mb-1">
              {getDayName(day.date)}
            </p>
            <img 
              src={`https:${day.day.condition.icon}`}
              alt={day.day.condition.text}
              className="w-6 h-6 mx-auto mb-1"
            />
            <p className="text-xs font-medium text-foreground">
              {Math.round(day.day.maxtemp_c)}°
            </p>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground mt-2">
        {weather.current.condition.text}
      </p>
    </div>
  );
}