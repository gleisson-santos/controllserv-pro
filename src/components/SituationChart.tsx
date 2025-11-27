import { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { supabase } from '@/integrations/supabase/client';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface SituationChartProps {
  selectedDate: string;
  refreshTrigger?: number;
}

interface DailyInfo {
  extravasamento: number;
  servico_turma_02: number;
  servico_turma_05: number;
  oge: number;
}

export default function SituationChart({ selectedDate, refreshTrigger }: SituationChartProps) {
  const [data, setData] = useState<DailyInfo>({
    extravasamento: 0,
    servico_turma_02: 0,
    servico_turma_05: 0,
    oge: 0
  });

  useEffect(() => {
    console.log('SituationChart - Loading data for date:', selectedDate, 'refreshTrigger:', refreshTrigger);
    loadDailyInfo();
  }, [selectedDate, refreshTrigger]);

  const loadDailyInfo = async () => {
    try {
      const { data: dailyInfo, error } = await (supabase as any)
        .from('general_info')
        .select('*')
        .eq('date', selectedDate)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (dailyInfo) {
        console.log('SituationChart - Data loaded:', dailyInfo);
        setData({
          extravasamento: dailyInfo.extravasamento || 0,
          servico_turma_02: dailyInfo.servico_turma_02 || 0,
          servico_turma_05: dailyInfo.servico_turma_05 || 0,
          oge: dailyInfo.oge || 0
        });
      } else {
        setData({
          extravasamento: 0,
          servico_turma_02: 0,
          servico_turma_05: 0,
          oge: 0
        });
      }
    } catch (error) {
      console.error('Error loading daily info:', error);
      setData({
        extravasamento: 0,
        servico_turma_02: 0,
        servico_turma_05: 0,
        oge: 0
      });
    }
  };

  const chartData = {
    labels: ['Extravasamento', 'Serviço Turma 02', 'Serviço Turma 05', 'OGE'],
    datasets: [
      {
        label: 'Quantidade',
        data: [data.extravasamento, data.servico_turma_02, data.servico_turma_05, data.oge],
        backgroundColor: [
          'hsl(217, 91%, 60%)', // Blue - #3b82f6
          'hsl(160, 84%, 39%)', // Green - #059669
          'hsl(32, 95%, 44%)',  // Orange - #d97706
          'hsl(0, 84%, 60%)'    // Red - #dc2626
        ],
        borderColor: [
          'hsl(217, 91%, 50%)',
          'hsl(160, 84%, 29%)',
          'hsl(32, 95%, 34%)',
          'hsl(0, 84%, 50%)'
        ],
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-4">Gráfico de Situação</h3>
      <div style={{ height: '200px' }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}