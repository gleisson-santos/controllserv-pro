import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import StatsCards from '@/components/StatsCards';
import VehicleManagement from '@/components/VehicleManagement';
import Sidebar from '@/components/Sidebar';
import WeatherCard from '@/components/WeatherCard';

export default function Dashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // Obtém o dia, mês e ano no fuso horário localsds
    // Obtém o dia, mês e ano no fuso horário localsds
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Mês é base 0
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`; // Formato "YYYY-MM-DD"
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState({ total: 0, funcionando: 0, quebrado: 0, emprestado: 0 });
  const [generalInfo, setGeneralInfo] = useState({ extravasamento: 0, servico_turma_02: 0, servico_turma_05: 0, oge: 0 });
  const [isHookLoading, setIsHookLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Até breve!",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-2xl text-primary"></i>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getUserInitial = () => {
    const name = user.user_metadata?.full_name || user.email;
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const getUserDisplayName = () => {
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
  };

  const handleWebhook = async () => {
    setIsHookLoading(true);
    try {
      // Buscar dados detalhados por tipo de veículo
      const { data: vehicleStatusData, error: statusError } = await supabase
        .from('vehicle_status')
        .select(`
          status,
          vehicles!inner(type)
        `)
        .eq('date', selectedDate);

      if (statusError) throw statusError;

      // Agrupar por tipo de veículo
      const vehiclesByType: Record<string, { funcionando: number; quebrado: number }> = {};

      vehicleStatusData?.forEach(item => {
        const vehicleType = item.vehicles.type;
        
        if (!vehiclesByType[vehicleType]) {
          vehiclesByType[vehicleType] = { funcionando: 0, quebrado: 0 };
        }

        if (item.status === 'Funcionando - Operando' || item.status === 'Funcionando - Parado') {
          vehiclesByType[vehicleType].funcionando++;
        } else if (item.status === 'Manutenção - Veiculo' || item.status === 'Manutenção - Equipamento') {
          vehiclesByType[vehicleType].quebrado++;
        }
      });

      const payload = {
        data: formatDate(selectedDate),
        frota_por_tipo: vehiclesByType,
        resumo_frota: {
          total: stats.total,
          funcionando: {
            quantidade: stats.funcionando,
            percentual: stats.total > 0 ? Math.round((stats.funcionando / stats.total) * 100) : 0
          },
          quebrados: {
            quantidade: stats.quebrado,
            percentual: stats.total > 0 ? Math.round((stats.quebrado / stats.total) * 100) : 0
          },
          emprestados: {
            quantidade: stats.emprestado,
            percentual: stats.total > 0 ? Math.round((stats.emprestado / stats.total) * 100) : 0
          }
        },
        informativo_geral: {
          extravasamento: generalInfo.extravasamento,
          servico_turma_02: generalInfo.servico_turma_02,
          servico_turma_05: generalInfo.servico_turma_05,
          oge: generalInfo.oge
        },
        usuario: {
          nome: getUserDisplayName(),
          email: user.email
        }
      };

      await fetch("https://hook.us2.make.com/geyqny8cuxoa1976d6z57j3tmcbbir99", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify(payload),
      });

      toast({
        title: "Dados enviados",
        description: "Informações enviadas para o webhook com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao enviar dados para o webhook",
        variant: "destructive",
      });
    }
    setIsHookLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-header text-white p-6">
        <div className="w-full px-4 lg:px-6 xl:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestão de frota e demandas</h1>
            <p className="text-blue-100 mt-1">
              Situação diária UMBS - {formatDate(selectedDate)}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-semibold">
                {getUserInitial()}
              </div>
              <div className="text-right">
                <p className="font-medium">Olá {getUserDisplayName()}</p>
                <p className="text-sm text-blue-100">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleWebhook}
              disabled={isHookLoading}
              className="btn-secondary !bg-white/10 !text-white border-white/20 hover:!bg-white/20 text-sm px-3 py-2"
              title="Enviar dados para webhook"
            >
              {isHookLoading ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-paper-plane"></i>
              )}
              Hook
            </button>
            <button
              onClick={handleSignOut}
              className="btn-secondary !bg-white/10 !text-white border-white/20 hover:!bg-white/20"
            >
              <i className="fas fa-sign-out-alt"></i>
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full px-4 lg:px-6 xl:px-8 py-6">
        {/* Stats Cards */}
        <StatsCards 
          selectedDate={selectedDate} 
          onStatsChange={setStats}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Vehicle Management - 2/3 width */}
          <div className="lg:col-span-2">
            <VehicleManagement 
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              refreshTrigger={refreshTrigger}
            />
          </div>

          {/* Right Column - Weather + Sidebar */}
          <div className="space-y-6">
            {/* Weather Card */}
            <WeatherCard />
            
            {/* Sidebar */}
            <Sidebar 
              selectedDate={selectedDate} 
              onDataSaved={() => setRefreshTrigger(prev => prev + 1)}
              onGeneralInfoChange={setGeneralInfo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
