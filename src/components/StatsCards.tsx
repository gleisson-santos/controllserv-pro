import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StatsCardsProps {
  selectedDate: string;
  onStatsChange?: (stats: Stats) => void;
}

interface Stats {
  total: number;
  funcionando: number;
  quebrado: number;
  emprestado: number;
}

export default function StatsCards({ selectedDate, onStatsChange }: StatsCardsProps) {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    funcionando: 0,
    quebrado: 0,
    emprestado: 0
  });

  useEffect(() => {
    loadStats();
  }, [selectedDate]);

  const loadStats = async () => {
    console.log('Loading stats for date:', selectedDate);
    try {
      // Get vehicle status for selected date only
      const { data: statusData, error: statusError } = await supabase
        .from('vehicle_status')
        .select('status')
        .eq('date', selectedDate);

      if (statusError) throw statusError;

      const statusCounts = {
        funcionando: 0,
        quebrado: 0,
        emprestado: 0
      };

      // Count only vehicles with status for the selected date
      statusData?.forEach(item => {
        if (item.status === 'Funcionando - Operando' || item.status === 'Funcionando - Parado') statusCounts.funcionando++;
        else if (item.status === 'Manutenção - Veiculo' || item.status === 'Manutenção - Equipamento') statusCounts.quebrado++;
        else if (item.status === 'Emprestado') statusCounts.emprestado++;
      });

      const total = statusData?.length || 0;

      console.log('Stats data loaded:', { statusData, statusCounts, total });

      const newStats = {
        total,
        ...statusCounts
      };
      
      setStats(newStats);
      onStatsChange?.(newStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Veículos */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total de Veículos</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <i className="fas fa-car text-primary text-xl"></i>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Frota total cadastrada</p>
      </div>

      {/* Funcionando */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Funcionando</p>
            <p className="text-2xl font-bold text-green-600">{stats.funcionando}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-check-circle text-green-600 text-xl"></i>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {getPercentage(stats.funcionando, stats.total)}% da frota
        </p>
      </div>

      {/* Quebrados */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Quebrados</p>
            <p className="text-2xl font-bold text-red-600">{stats.quebrado}</p>
          </div>
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {getPercentage(stats.quebrado, stats.total)}% da frota
        </p>
      </div>

      {/* Emprestados */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Emprestados</p>
            <p className="text-2xl font-bold text-orange-600">{stats.emprestado}</p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-handshake text-orange-600 text-xl"></i>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {getPercentage(stats.emprestado, stats.total)}% da frota
        </p>
      </div>
    </div>
  );
}