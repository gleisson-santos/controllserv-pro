-- Update RLS policies to allow proper upserts on vehicle_status table

-- Drop the current update policy to recreate it properly
DROP POLICY IF EXISTS "Users can update vehicle status" ON public.vehicle_status;

-- Create a new update policy that allows updates based on vehicle_id and date
CREATE POLICY "Users can update vehicle status" 
ON public.vehicle_status 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = created_by);

-- Also ensure the insert policy allows proper creation
DROP POLICY IF EXISTS "Users can create vehicle status" ON public.vehicle_status;

CREATE POLICY "Users can create vehicle status" 
ON public.vehicle_status 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);