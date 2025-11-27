import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import VehicleModal from './VehicleModal';
import VehicleTable from './VehicleTable';
import SituationChart from './SituationChart';
import TimelineModal from './TimelineModal';

interface VehicleManagementProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  refreshTrigger?: number;
}

export interface Vehicle {
  id: string;
  name: string;
  type: 'DESTACK' | 'EMBASA' | 'OUTROS';
  created_at: string;
  updated_at: string;
  driver?: string;
}

export interface VehicleStatus {
  id: string;
  vehicle_id: string;
  date: string;
  status: 'Funcionando - Operando' | 'Funcionando - Parado' | 'Manutenção - Veiculo' | 'Manutenção - Equipamento' | 'Emprestado';
  observations: string | null;
  vehicle?: Vehicle;
  driver?: string;
}

export default function VehicleManagement({ selectedDate, onDateChange, refreshTrigger }: VehicleManagementProps) {
  const [vehicles, setVehicles] = useState<VehicleStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, [selectedDate]);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      // Get only vehicles that have status for the selected date
      const { data: statusData, error: statusError } = await supabase
        .from('vehicle_status')
        .select(`
          *,
          vehicles:vehicle_id (
            id,
            name,
            type,
            driver,
            created_at,
            updated_at
          )
        `)
        .eq('date', selectedDate);

      if (statusError) throw statusError;

      // Map to VehicleStatus format - only show vehicles with actual status for the date
      const vehiclesWithStatus: VehicleStatus[] = statusData?.map(status => ({
        id: status.id,
        vehicle_id: status.vehicle_id,
        date: selectedDate,
        status: status.status as any,
        observations: status.observations || null,
        driver: status.driver || (status.vehicles as any)?.driver || '',
        vehicle: {
          ...(status.vehicles as any),
          type: (status.vehicles as any)?.type as 'DESTACK' | 'EMBASA' | 'OUTROS'
        }
      })) || [];

      setVehicles(vehiclesWithStatus);
    } catch (error: any) {
      console.error('Error loading vehicles:', error);
      toast({
        title: "Erro ao carregar veículos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPreviousDay = async () => {
    try {
      const previousDate = new Date(selectedDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split('T')[0];

      // Get previous day data
      const { data: previousData, error: fetchError } = await supabase
        .from('vehicle_status')
        .select('*')
        .eq('date', previousDateStr);

      if (fetchError) throw fetchError;

      if (!previousData || previousData.length === 0) {
        toast({
          title: "Aviso",
          description: "Não há dados do dia anterior para copiar.",
          variant: "destructive"
        });
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Delete existing data for current date
      const { error: deleteError } = await supabase
        .from('vehicle_status')
        .delete()
        .eq('date', selectedDate);

      if (deleteError) throw deleteError;

      // Insert copied data with new date
      const dataToInsert = previousData.map(item => ({
        vehicle_id: item.vehicle_id,
        date: selectedDate,
        status: item.status,
        observations: item.observations,
        driver: item.driver,
        created_by: user.id
      }));

      const { error: insertError } = await supabase
        .from('vehicle_status')
        .insert(dataToInsert);

      if (insertError) throw insertError;

      toast({
        title: "Sucesso",
        description: "Dados do dia anterior copiados com sucesso!",
      });

      loadVehicles();
    } catch (error: any) {
      console.error('Error copying previous day:', error);
      toast({
        title: "Erro ao copiar dados",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredVehicles = vehicles.filter(v =>
    v.vehicle?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Gestão de Veículos</h2>
            <p className="text-sm text-muted-foreground">
              Controle diário do status da frota
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <i className="fas fa-calendar-alt text-muted-foreground"></i>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={copyPreviousDay}
              className="btn-warning"
            >
              <i className="fas fa-copy"></i>
              Copiar Dia Anterior
            </button>
            <button
              onClick={() => setShowTimelineModal(true)}
              className="btn-secondary"
            >
              <i className="fas fa-chart-line"></i>
              Analisa Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-6 border-b border-border">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
            <input
              type="text"
              placeholder="Buscar veículo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-input rounded-lg focus:ring-2 focus:ring-ring"
            />
          </div>
          
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <i className="fas fa-plus"></i>
            Adicionar Veículo
          </button>
        </div>
        
      </div>

      {/* Vehicle Table */}
      <VehicleTable
        vehicles={filteredVehicles}
        loading={loading}
        selectedDate={selectedDate}
        onEdit={setEditingVehicle}
        onRefresh={loadVehicles}
      />

      {/* Situation Chart */}
      <div className="p-6">
        <SituationChart 
          selectedDate={selectedDate} 
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Vehicle Modal */}
      {(showModal || editingVehicle) && (
        <VehicleModal
          vehicle={editingVehicle}
          onClose={() => {
            setShowModal(false);
            setEditingVehicle(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingVehicle(null);
            loadVehicles();
          }}
          selectedDate={selectedDate}
        />
      )}

      {/* Timeline Modal */}
      <TimelineModal
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        selectedDate={selectedDate}
      />
    </div>
  );
}