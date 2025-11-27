-- Add unique constraint to vehicle_status table for vehicle_id and date
-- This is needed for the UPSERT operation to work correctly
ALTER TABLE public.vehicle_status 
ADD CONSTRAINT vehicle_status_vehicle_id_date_unique UNIQUE (vehicle_id, date);