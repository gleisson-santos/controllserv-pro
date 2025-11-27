-- First, delete duplicate records keeping only the most recent one for each date/user combination
DELETE FROM public.general_info 
WHERE id NOT IN (
  SELECT DISTINCT ON (date, created_by) id 
  FROM public.general_info 
  ORDER BY date, created_by, created_at DESC
);

-- Now add the unique constraint
ALTER TABLE public.general_info 
ADD CONSTRAINT unique_date_user UNIQUE (date, created_by);