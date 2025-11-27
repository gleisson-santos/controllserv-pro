-- Add driver column to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN driver TEXT;

-- Add driver column to vehicle_status table for historical tracking
ALTER TABLE public.vehicle_status 
ADD COLUMN driver TEXT;