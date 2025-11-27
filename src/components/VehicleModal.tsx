import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Vehicle } from './VehicleManagement';

interface VehicleModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onSave: () => void;
  selectedDate: string;
}

export default function VehicleModal({ vehicle, onClose, onSave, selectedDate }: VehicleModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'DESTACK'|'A.CUNHA' | 'EMBASA' | 'OUTROS'>('OUTROS');
  const [status, setStatus] = useState<'Funcionando - Operando' | 'Funcionando - Parado' | 'Manutenção - Veiculo' | 'Manutenção - Equipamento' | 'Emprestado'>('Funcionando - Operando');
  const [observations, setObservations] = useState('');
  const [driver, setDriver] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para os dados já cadastrados
  const [existingPlates, setExistingPlates] = useState<string[]>([]);
  const [existingDrivers, setExistingDrivers] = useState<string[]>([]);
  const [showPlateDropdown, setShowPlateDropdown] = useState(false);
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);

  useEffect(() => {
    loadExistingData();
    if (vehicle) {
      setName(vehicle.name);
      setType(vehicle.type);
      setDriver(vehicle.driver || '');
      loadVehicleStatus();
    } else {
      setName('');
      setType('OUTROS');
      setStatus('Funcionando - Operando');
      setObservations('');
      setDriver('');
    }
  }, [vehicle, selectedDate]);

  const loadExistingData = async () => {
    try {
      // Buscar placas existentes
      const { data: plateData, error: plateError } = await supabase
        .from('vehicles')
        .select('name')
        .order('name');

      if (plateError) throw plateError;

      const plates = [...new Set(plateData?.map(v => v.name) || [])];
      setExistingPlates(plates);

      // Buscar motoristas existentes (tanto da tabela vehicles quanto vehicle_status)
      const { data: vehicleDrivers, error: vehicleError } = await supabase
        .from('vehicles')
        .select('driver')
        .not('driver', 'is', null);

      const { data: statusDrivers, error: statusError } = await supabase
        .from('vehicle_status')
        .select('driver')
        .not('driver', 'is', null);

      if (vehicleError) throw vehicleError;
      if (statusError) throw statusError;

      const allDrivers = [
        ...(vehicleDrivers?.map(v => v.driver) || []),
        ...(statusDrivers?.map(v => v.driver) || [])
      ];
      
      const uniqueDrivers = [...new Set(allDrivers.filter(d => d && d.trim() !== ''))];
      setExistingDrivers(uniqueDrivers);
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const loadVehicleStatus = async () => {
    if (!vehicle) return;
    
    try {
      const { data, error } = await supabase
        .from('vehicle_status')
        .select('status, observations, driver')
        .eq('vehicle_id', vehicle.id)
        .eq('date', selectedDate)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setStatus(data.status as any);
        setObservations(data.observations || '');
        setDriver(data.driver || '');
      }
    } catch (error) {
      console.error('Error loading vehicle status:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (vehicle) {
        console.log('Updating vehicle:', vehicle.id, { name, type });
        
        // Update existing vehicle
        const { error } = await supabase
          .from('vehicles')
          .update({ name, type, driver })
          .eq('id', vehicle.id);

        if (error) {
          console.error('Error updating vehicle:', error);
          throw error;
        }

        console.log('Vehicle updated successfully, now updating status...');

        // Get current user for status update
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        console.log('Updating vehicle status:', {
          vehicle_id: vehicle.id,
          date: selectedDate,
          status,
          observations: observations,
          observationsLength: observations.length,
          created_by: user.id
        });

        // Update vehicle status
        const { error: statusError } = await supabase
          .from('vehicle_status')
          .upsert({
            vehicle_id: vehicle.id,
            date: selectedDate,
            status,
            observations,
            driver,
            created_by: user.id
          }, {
            onConflict: 'vehicle_id,date'
          });

        if (statusError) {
          console.error('Error updating vehicle status:', statusError);
          throw statusError;
        }

        console.log('Vehicle status updated successfully');

        toast({
          title: "Veículo atualizado",
          description: "Veículo atualizado com sucesso!",
        });
      } else {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        // Create new vehicle
        const { data: newVehicle, error } = await supabase
          .from('vehicles')
          .insert({ 
            name, 
            type,
            driver,
            created_by: user.id
          })
          .select()
          .single();

        if (error) throw error;

        // Create initial vehicle status
        console.log('Creating vehicle status with observations:', {
          observations: observations,
          observationsLength: observations.length
        });
        
        const { error: statusError } = await supabase
          .from('vehicle_status')
          .insert({
            vehicle_id: newVehicle.id,
            date: selectedDate,
            status,
            observations: observations,
            driver,
            created_by: user.id
          });

        if (statusError) throw statusError;

        toast({
          title: "Veículo criado",
          description: "Veículo adicionado com sucesso!",
        });
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      toast({
        title: "Erro ao salvar veículo",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowPlateDropdown(false);
          setShowDriverDropdown(false);
        }
      }}
    >
      <div className="bg-card rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-foreground">
            {vehicle ? 'Editar Veículo' : 'Adicionar Veículo'}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-foreground mb-2">
              Placa
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setShowPlateDropdown(true)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring"
                placeholder="Ex: ABC-1234"
                required
              />
              {showPlateDropdown && existingPlates.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border border-input rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {existingPlates
                    .filter(plate => plate.toLowerCase().includes(name.toLowerCase()))
                    .map((plate, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setName(plate);
                          setShowPlateDropdown(false);
                        }}
                      >
                        {plate}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-foreground mb-2">
              Motorista
            </label>
            <div className="relative">
              <input
                type="text"
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                onFocus={() => setShowDriverDropdown(true)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring"
                placeholder="Nome do motorista"
              />
              {showDriverDropdown && existingDrivers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border border-input rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {existingDrivers
                    .filter(driverName => driverName.toLowerCase().includes(driver.toLowerCase()))
                    .map((driverName, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setDriver(driverName);
                          setShowDriverDropdown(false);
                        }}
                      >
                        {driverName}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'DESTACK'|'A.CUNHA'| 'EMBASA' | 'OUTROS')}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring"
            >
              <option value="DESTACK">DESTACK</option>
              <option value="A.CUNHA">A.CUNHA</option>
              <option value="EMBASA">EMBASA</option>
              <option value="OUTROS">OUTROS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Funcionando - Operando' | 'Funcionando - Parado' | 'Manutenção - Veiculo' | 'Manutenção - Equipamento' | 'Emprestado')}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring"
            >
              <option value="Funcionando - Operando">Funcionando - Operando</option>
              <option value="Funcionando - Parado">Funcionando - Parado</option>
              <option value="Manutenção - Veiculo">Manutenção - Veiculo</option>
              <option value="Manutenção - Equipamento">Manutenção - Equipamento</option>
              <option value="Emprestado">Emprestado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Observações
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring"
              placeholder="Observações sobre o veículo..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                vehicle ? 'Atualizar' : 'Adicionar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
