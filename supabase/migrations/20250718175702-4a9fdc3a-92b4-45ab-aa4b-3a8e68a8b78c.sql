-- Create enum for vehicle types
CREATE TYPE public.vehicle_type AS ENUM ('DESTACK', 'EMBASA', 'OUTROS');

-- Create enum for vehicle status
CREATE TYPE public.vehicle_status_enum AS ENUM ('Funcionando', 'Quebrado', 'Emprestado', 'Manutenção', 'Indisponível');

-- Create vehicles table
CREATE TABLE public.vehicles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type vehicle_type NOT NULL DEFAULT 'OUTROS',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicle_status table for daily status tracking
CREATE TABLE public.vehicle_status (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status vehicle_status_enum NOT NULL DEFAULT 'Funcionando',
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(vehicle_id, date)
);

-- Create daily_info table for general information
CREATE TABLE public.daily_info (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    extravasamento INTEGER DEFAULT 0,
    servico_turma_02 INTEGER DEFAULT 0,
    servico_turma_05 INTEGER DEFAULT 0,
    oge INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_observations table
CREATE TABLE public.daily_observations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_observations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vehicles
CREATE POLICY "Users can view all vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (true);

-- Create RLS policies for vehicle_status
CREATE POLICY "Users can view all vehicle status" ON public.vehicle_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create vehicle status" ON public.vehicle_status FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update vehicle status" ON public.vehicle_status FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete vehicle status" ON public.vehicle_status FOR DELETE TO authenticated USING (true);

-- Create RLS policies for daily_info
CREATE POLICY "Users can view all daily info" ON public.daily_info FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create daily info" ON public.daily_info FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update daily info" ON public.daily_info FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete daily info" ON public.daily_info FOR DELETE TO authenticated USING (true);

-- Create RLS policies for daily_observations
CREATE POLICY "Users can view all daily observations" ON public.daily_observations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create daily observations" ON public.daily_observations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update daily observations" ON public.daily_observations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete daily observations" ON public.daily_observations FOR DELETE TO authenticated USING (true);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicle_status_updated_at
    BEFORE UPDATE ON public.vehicle_status
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_info_updated_at
    BEFORE UPDATE ON public.daily_info
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_observations_updated_at
    BEFORE UPDATE ON public.daily_observations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();