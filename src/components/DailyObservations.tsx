import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface DailyObservationsProps {
  selectedDate: string;
}

interface Observation {
  id: string;
  date: string;
  content: string;
  created_at: string;
}

export default function DailyObservations({ selectedDate }: DailyObservationsProps) {
  const { user } = useAuth();
  const [observations, setObservations] = useState('');
  const [observationDate, setObservationDate] = useState(selectedDate);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Observation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  useEffect(() => {
    if (selectedDate) {
      // Use current date instead of selectedDate for new observations
      const today = new Date().toISOString().split('T')[0];
      setObservationDate(today);
      loadObservations();
      loadHistory();
    }
  }, [selectedDate]);

  useEffect(() => {
    loadObservations();
  }, [observationDate]);

  const loadObservations = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_observations')
        .select('*')
        .eq('date', observationDate)
        .maybeSingle();

      if (error) throw error;
      
      setObservations(data?.content || '');
    } catch (error) {
      console.error('Error loading observations:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_observations')
        .select('*')
        .eq('date', selectedDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const saveObservations = async () => {
    if (!observations.trim() || !user) return;
    
    setSaving(true);
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('daily_observations')
        .upsert({
          date: observationDate,
          content: observations,
          created_by: currentUser.id
        });

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Observações salvas com sucesso!",
      });
      
      setObservations('');
      loadHistory(); // Reload history after saving
    } catch (error) {
      console.error('Error saving observations:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar observações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const clearObservations = () => {
    setObservations('');
  };

  const startEditing = (id: string, content: string) => {
    setEditingId(id);
    setEditingContent(content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const saveEdit = async (id: string) => {
    if (!editingContent.trim()) return;
    
    try {
      const { error } = await supabase
        .from('daily_observations')
        .update({ content: editingContent })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Observação editada com sucesso!",
      });
      
      setEditingId(null);
      setEditingContent('');
      loadHistory();
    } catch (error) {
      console.error('Error updating observation:', error);
      toast({
        title: "Erro",
        description: "Erro ao editar observação",
        variant: "destructive",
      });
    }
  };

  const deleteObservation = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta observação?')) return;
    
    try {
      const { error } = await supabase
        .from('daily_observations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Observação excluída com sucesso!",
      });
      
      loadHistory();
    } catch (error) {
      console.error('Error deleting observation:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir observação",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  const getPreview = (content: string, maxLength = 50) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <h3 className="text-lg font-semibold text-card-foreground mb-4">
        <i className="fas fa-sticky-note mr-2 text-primary"></i>
        Observações Diárias
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-2">
            Data da Observação
          </label>
          <Input
            type="date"
            value={observationDate}
            onChange={(e) => setObservationDate(e.target.value)}
            className="w-full mb-3"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-2">
            Notas e informações importantes
          </label>
          <Textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Digite suas observações para o dia..."
            className="w-full h-32 resize-none"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={saveObservations}
            disabled={saving || !observations.trim()}
            className="btn-success"
          >
            <i className="fas fa-save mr-2"></i>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
          
          <Button
            onClick={clearObservations}
            variant="secondary"
          >
            <i className="fas fa-broom mr-2"></i>
            Limpar
          </Button>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <h4 className="text-md font-medium text-card-foreground mb-3">
            <i className="fas fa-history mr-2 text-muted-foreground"></i>
            Histórico de Observações
          </h4>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {history.map((item) => (
              <Card key={item.id} className="bg-muted/30">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium">
                      📅 {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </CardTitle>
                    <div className="flex gap-2">
                      {editingId === item.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => saveEdit(item.id)}
                            className="h-6 px-2 text-xs bg-success hover:bg-success/90"
                          >
                            <i className="fas fa-check"></i>
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={cancelEditing}
                            className="h-6 px-2 text-xs"
                          >
                            <i className="fas fa-times"></i>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(item.id, item.content)}
                            className="h-6 px-2 text-xs hover:bg-primary hover:text-primary-foreground"
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteObservation(item.id)}
                            className="h-6 px-2 text-xs hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString('pt-BR')}
                  </span>
                </CardHeader>
                <CardContent className="pt-0">
                  {editingId === item.id ? (
                    <Textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="w-full h-20 text-sm resize-none"
                    />
                  ) : (
                    <p className="text-sm text-card-foreground whitespace-pre-wrap">
                      {item.content}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}