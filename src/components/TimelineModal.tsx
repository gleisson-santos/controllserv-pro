import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { X, ChevronUp, ChevronDown } from 'lucide-react';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
}

interface TimelineData {
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  driverName: string;
  dailyStatus: { [key: string]: string };
}

type SortColumn = 'vehicleName' | 'driverName' | 'vehicleType';
type SortDirection = 'asc' | 'desc';

const statusColors = {
  'Funcionando - Operando': 'bg-green-500',
  'Funcionando - Parado': 'bg-green-300',
  'Manutenção - Veiculo': 'bg-red-500',
  'Manutenção - Equipamento': 'bg-red-300',
  'Emprestado': 'bg-yellow-500',
  '': 'bg-gray-200'
};

export default function TimelineModal({ isOpen, onClose, selectedDate }: TimelineModalProps) {
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date(selectedDate);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
  const [sortColumn, setSortColumn] = useState<SortColumn>('vehicleName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    if (isOpen) {
      loadTimelineData();
    }
  }, [isOpen, selectedMonth]);

  const loadTimelineData = async () => {
    setLoading(true);
    try {
      const year = selectedMonth.split('-')[0];
      const month = selectedMonth.split('-')[1];
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      // Get all vehicle status data for the month with vehicle info
      const { data: statusData, error } = await supabase
        .from('vehicle_status')
        .select(`
          *,
          vehicles:vehicle_id (
            id,
            name,
            type
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;

      // Create a map to group vehicles and avoid duplicates
      const vehicleMap = new Map<string, TimelineData>();
      
      // Process status data and group by vehicle
      statusData?.forEach(status => {
        const vehicle = status.vehicles as any;
        if (!vehicle) return;

        const vehicleId = vehicle.id;
        
        // If vehicle doesn't exist in map, create it
        if (!vehicleMap.has(vehicleId)) {
          vehicleMap.set(vehicleId, {
            vehicleId: vehicleId,
            vehicleName: vehicle.name,
            vehicleType: vehicle.type,
            driverName: status.driver || '',
            dailyStatus: {}
          });
        }

        // Get the vehicle data from map
        const vehicleData = vehicleMap.get(vehicleId);
        if (vehicleData) {
          // Add the status for this date
          vehicleData.dailyStatus[status.date] = status.status;
          
          // Update driver name if provided (keep the most recent one)
          if (status.driver && status.driver.trim() !== '') {
            vehicleData.driverName = status.driver;
          }
        }
      });

      // Convert map to array
      const timelineArray = Array.from(vehicleMap.values());

      setTimelineData(timelineArray);
    } catch (error: any) {
      console.error('Error loading timeline data:', error);
      toast({
        title: "Erro ao carregar timeline",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = parseInt(selectedMonth.split('-')[0]);
    const month = parseInt(selectedMonth.split('-')[1]);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1; // Sempre começa do dia 1
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return dateString;
    });
    
    return dates;
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-3 h-3 inline ml-1" /> : 
      <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  const sortedTimelineData = [...timelineData].sort((a, b) => {
    let aValue: string, bValue: string;
    
    switch (sortColumn) {
      case 'vehicleName':
        aValue = a.vehicleName;
        bValue = b.vehicleName;
        break;
      case 'driverName':
        aValue = a.driverName || '';
        bValue = b.driverName || '';
        break;
      case 'vehicleType':
        aValue = a.vehicleType;
        bValue = b.vehicleType;
        break;
      default:
        return 0;
    }

    const comparison = aValue.localeCompare(bValue);
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const days = getDaysInMonth();

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Timeline Mensal dos Veículos</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Month selector */}
          <div className="flex items-center gap-4">
            <label htmlFor="month-select" className="text-sm font-medium">
              Mês:
            </label>
            <input
              id="month-select"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs">
            {Object.entries(statusColors).map(([status, color]) => (
              status && (
                <div key={status} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${color}`}></div>
                  <span>{status}</span>
                </div>
              )
            ))}
          </div>

          {/* Timeline table */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-auto max-h-[60vh] border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th 
                      className="text-left p-1 border-r sticky left-0 bg-muted/50 z-20 w-[120px] cursor-pointer hover:bg-muted/70"
                      onClick={() => handleSort('vehicleName')}
                    >
                      Veículo {getSortIcon('vehicleName')}
                    </th>
                    <th 
                      className="text-left p-1 border-r sticky left-[120px] bg-muted/50 z-20 w-[100px] cursor-pointer hover:bg-muted/70"
                      onClick={() => handleSort('driverName')}
                    >
                      Nome Motorista {getSortIcon('driverName')}
                    </th>
                    <th 
                      className="text-left p-1 border-r sticky left-[220px] bg-muted/50 z-20 w-[70px] cursor-pointer hover:bg-muted/70"
                      onClick={() => handleSort('vehicleType')}
                    >
                      Tipo {getSortIcon('vehicleType')}
                    </th>
                    {days.map((date, index) => (
                      <th key={`day-${index}`} className="text-center p-1 border-r w-[25px] text-xs bg-muted/50">
                        {new Date(date + 'T00:00:00').getDate()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedTimelineData.map(vehicle => (
                    <tr key={vehicle.vehicleId} className="border-b hover:bg-muted/30">
                      <td className="p-1 border-r font-medium sticky left-0 bg-background z-20 w-[120px] text-xs">
                        {vehicle.vehicleName}
                      </td>
                      <td className="p-1 border-r text-xs sticky left-[120px] bg-background z-20 w-[100px]">
                        {vehicle.driverName || '-'}
                      </td>
                      <td className="p-1 border-r text-xs sticky left-[220px] bg-background z-20 w-[70px]">
                        {vehicle.vehicleType}
                      </td>
                      {days.map((date, index) => {
                        const status = vehicle.dailyStatus[date] || '';
                        const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-200';
                        return (
                          <td key={`${vehicle.vehicleId}-day-${index}`} className="p-0.5 border-r w-[25px]">
                            <div 
                              className={`w-full h-5 rounded ${colorClass}`}
                              title={`Dia ${new Date(date + 'T00:00:00').getDate()}: ${status || 'Sem dados'}`}
                            ></div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}