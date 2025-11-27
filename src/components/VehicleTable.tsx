import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Vehicle, VehicleStatus } from './VehicleManagement';
import { ChevronUp, ChevronDown } from 'lucide-react';
import ObservationCell from './ObservationCell';

interface VehicleTableProps {
  vehicles: VehicleStatus[];
  loading: boolean;
  selectedDate: string;
  onEdit: (vehicle: Vehicle) => void;
  onRefresh: () => void;
}

type SortColumn = 'name' | 'driver' | 'type' | 'status';
type SortDirection = 'asc' | 'desc';

export default function VehicleTable({ vehicles, loading, selectedDate, onEdit, onRefresh }: VehicleTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedVehicles = [...vehicles].sort((a, b) => {
    let aValue: string, bValue: string;
    
    switch (sortColumn) {
      case 'name':
        aValue = a.vehicle?.name || '';
        bValue = b.vehicle?.name || '';
        break;
      case 'driver':
        aValue = a.driver || '';
        bValue = b.driver || '';
        break;
      case 'type':
        aValue = a.vehicle?.type || '';
        bValue = b.vehicle?.type || '';
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        return 0;
    }
    
    const comparison = aValue.localeCompare(bValue);
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const deleteVehicle = async (vehicleId: string) => {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) throw error;

      toast({
        title: "Veículo excluído",
        description: "Veículo removido com sucesso!",
      });

      onRefresh();
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      toast({
        title: "Erro ao excluir veículo",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Funcionando - Operando':
      case 'Funcionando - Parado':
        return 'status-funcionando';
      case 'Manutenção - Veiculo':
      case 'Manutenção - Equipamento':
        return 'status-quebrado';
      case 'Emprestado':
        return 'status-emprestado';
      default:
        return 'status-funcionando';
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <i className="fas fa-spinner fa-spin text-2xl text-primary"></i>
        <p className="mt-2 text-muted-foreground">Carregando veículos...</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto">
        <thead className="bg-muted/50 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">
              <button 
                onClick={() => handleSort('name')}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Placa
                {getSortIcon('name')}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
              <button 
                onClick={() => handleSort('driver')}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Motorista
                {getSortIcon('driver')}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
              <button 
                onClick={() => handleSort('type')}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Tipo
                {getSortIcon('type')}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-44">
              <button 
                onClick={() => handleSort('status')}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Status
                {getSortIcon('status')}
              </button>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Observações
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {sortedVehicles.map((vehicleStatus) => (
            <tr key={vehicleStatus.vehicle_id} className="hover:bg-muted/25">
              <td className="px-4 py-2 text-sm font-medium text-foreground">
                {vehicleStatus.vehicle?.name}
              </td>
              <td className="px-4 py-2 text-sm text-muted-foreground">
                {vehicleStatus.driver || '-'}
              </td>
              <td className="px-4 py-2 text-sm text-muted-foreground">
                {vehicleStatus.vehicle?.type}
              </td>
              <td className="px-4 py-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeClass(vehicleStatus.status)}`}>
                  {vehicleStatus.status}
                </span>
              </td>
               <td className="px-4 py-2 max-w-xs">
                 <ObservationCell observations={vehicleStatus.observations} />
               </td>
              <td className="px-4 py-2 text-center">
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => vehicleStatus.vehicle && onEdit(vehicleStatus.vehicle)}
                    className="text-primary hover:text-primary/80 p-1"
                    title="Editar veículo"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    onClick={() => deleteVehicle(vehicleStatus.vehicle_id)}
                    className="text-destructive hover:text-destructive/80 p-1"
                    title="Excluir veículo"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {vehicles.length === 0 && (
        <div className="p-8 text-center">
          <i className="fas fa-car text-4xl text-muted-foreground mb-4"></i>
          <p className="text-muted-foreground">Nenhum veículo cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Clique em "Adicionar Veículo" para começar
          </p>
        </div>
      )}
    </div>
  );
}