import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';

interface ObservationCellProps {
  observations: string | null;
  maxLength?: number;
}

export default function ObservationCell({ observations, maxLength = 50 }: ObservationCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const displayText = observations || 'Sem observações';
  const shouldTruncate = displayText.length > maxLength;
  const truncatedText = shouldTruncate ? `${displayText.slice(0, maxLength)}...` : displayText;

  if (!shouldTruncate) {
    return (
      <div className="text-sm text-muted-foreground">
        {displayText}
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button 
          className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left w-full"
          title="Clique para ver observação completa"
        >
          {truncatedText}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Observações</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {observations || 'Sem observações'}
          </p>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}