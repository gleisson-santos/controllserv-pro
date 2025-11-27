import { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import DailyObservations from './DailyObservations';

ChartJS.register(ArcElement, Tooltip, Legend);

interface SidebarProps {
  selectedDate: string;
  onDataSaved?: () => void;
  onGeneralInfoChange?: (info: DailyInfo) => void;
}

interface FleetStats {
  funcionando: number;
  quebrado: number;
  emprestado: number;
}

interface DailyInfo {
  extravasamento: number;
  servico_turma_02: number;
  servico_turma_05: number;
  oge: number;
}

export default function Sidebar({ selectedDate, onDataSaved, onGeneralInfoChange }: SidebarProps) {
  const [fleetStats, setFleetStats] = useState<FleetStats>({
    funcionando: 0,
    quebrado: 0,
    emprestado: 0
  });

  const [dailyInfo, setDailyInfo] = useState<DailyInfo>({
    extravasamento: 0,
    servico_turma_02: 0,
    servico_turma_05: 0,
    oge: 0
  });

  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);

  useEffect(() => {
    setIsEditing(false); // Reset editing state when date changes
    loadFleetStats();
    loadDailyInfo();
  }, [selectedDate]);

  const loadFleetStats = async () => {
    try {
      const { data: statusData, error } = await supabase
        .from('vehicle_status')
        .select('status')
        .eq('date', selectedDate);

      if (error) throw error;

      const stats = {
        funcionando: 0,
        quebrado: 0,
        emprestado: 0
      };

      statusData?.forEach(item => {
        if (item.status === 'Funcionando - Operando' || item.status === 'Funcionando - Parado') stats.funcionando++;
        else if (item.status === 'Manutenção - Veiculo' || item.status === 'Manutenção - Equipamento') stats.quebrado++;
        else if (item.status === 'Emprestado') stats.emprestado++;
      });

      setFleetStats(stats);
    } catch (error) {
      console.error('Error loading fleet stats:', error);
    }
  };

  const loadDailyInfo = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('general_info')
        .select('*')
        .eq('date', selectedDate)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setHasExistingData(true);
        const newInfo = {
          extravasamento: data.extravasamento || 0,
          servico_turma_02: data.servico_turma_02 || 0,
          servico_turma_05: data.servico_turma_05 || 0,
          oge: data.oge || 0
        };
        setDailyInfo(newInfo);
        onGeneralInfoChange?.(newInfo);
      } else {
        setHasExistingData(false);
        // Reset to default values if no data found
        const defaultInfo = {
          extravasamento: 0,
          servico_turma_02: 0,
          servico_turma_05: 0,
          oge: 0
        };
        setDailyInfo(defaultInfo);
        onGeneralInfoChange?.(defaultInfo);
      }
    } catch (error) {
      console.error('Error loading daily info:', error);
      setHasExistingData(false);
    }
  };

  const saveDailyInfo = async () => {
    if (!dailyInfo) return;
    
    setSaving(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await (supabase as any)
        .from('general_info')
        .upsert({
          date: selectedDate,
          extravasamento: dailyInfo.extravasamento,
          servico_turma_02: dailyInfo.servico_turma_02,
          servico_turma_05: dailyInfo.servico_turma_05,
          oge: dailyInfo.oge,
          created_by: user.id
        }, {
          onConflict: 'date,created_by'
        });

      if (error) throw error;
      
      setHasExistingData(true);
      setIsEditing(false);
      
      toast({
        title: "Sucesso",
        description: hasExistingData ? "Informações atualizadas com sucesso!" : "Informações salvas com sucesso!",
      });
      
      // Trigger refresh of chart
      console.log('Sidebar - Data saved, triggering refresh');
      onDataSaved?.();
    } catch (error) {
      console.error('Error saving daily info:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar informações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const enableEdit = () => {
    setIsEditing(true);
    toast({
      title: "Modo de edição ativado",
      description: "Você pode agora editar os valores. Clique em 'Salvar' para confirmar as alterações.",
    });
  };

  const chartData = {
    labels: ['Funcionando', 'Quebrados', 'Emprestados'],
    datasets: [
      {
        data: [fleetStats.funcionando, fleetStats.quebrado, fleetStats.emprestado],
        backgroundColor: [
          'hsl(160, 84%, 39%)', // Green - #059669
          'hsl(0, 84%, 60%)',   // Red - #dc2626
          'hsl(32, 95%, 44%)'   // Orange - #d97706
        ],
        borderColor: [
          'hsl(160, 84%, 29%)',
          'hsl(0, 84%, 50%)',
          'hsl(32, 95%, 34%)'
        ],
        borderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Fleet Status Chart */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Status da Frota</h3>
        <div style={{ height: '200px' }}>
          <Doughnut data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* General Information */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Informativo Geral
          </h3>
          {hasExistingData && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
              Dados salvos
            </span>
          )}
          {isEditing && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
              Editando
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Situação de demandas e serviços
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Extravasamento
            </label>
            <input
              type="number"
              value={dailyInfo.extravasamento}
              onChange={(e) => setDailyInfo(prev => ({ ...prev, extravasamento: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Serviço Turma 02
            </label>
            <input
              type="number"
              value={dailyInfo.servico_turma_02}
              onChange={(e) => setDailyInfo(prev => ({ ...prev, servico_turma_02: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Serviço Turma 05
            </label>
            <input
              type="number"
              value={dailyInfo.servico_turma_05}
              onChange={(e) => setDailyInfo(prev => ({ ...prev, servico_turma_05: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              OGE
            </label>
            <input
              type="number"
              value={dailyInfo.oge}
              onChange={(e) => setDailyInfo(prev => ({ ...prev, oge: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring"
              min="0"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={saveDailyInfo}
            disabled={saving}
            className="btn-success flex-1"
          >
            {saving ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-save"></i>
            )}
            Salvar
          </button>
          <button
            onClick={enableEdit}
            className="btn-secondary flex-1"
          >
            <i className="fas fa-edit"></i>
            Editar
          </button>
        </div>
      </div>

      {/* Daily Observations */}
      <DailyObservations selectedDate={selectedDate} />
    </div>
  );
}