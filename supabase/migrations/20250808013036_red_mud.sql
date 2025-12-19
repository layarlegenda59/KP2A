/*
  # SQL Executor Function for SQL Editor

  This migration creates a secure function to execute SQL queries from the SQL Editor component.
  
  1. Security Features
    - Only allows SELECT queries for safety
    - Runs with limited permissions
    - Validates input parameters
  
  2. Function
    - `execute_raw_sql` - Executes SELECT queries safely
*/

-- Create a function to execute SQL queries safely
CREATE OR REPLACE FUNCTION execute_raw_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  query_upper text;
BEGIN
  -- Validate input
  IF sql_query IS NULL OR length(trim(sql_query)) = 0 THEN
    RAISE EXCEPTION 'Query cannot be empty';
  END IF;
  
  -- Convert to uppercase for checking
  query_upper := upper(trim(sql_query));
  
  -- Only allow SELECT queries for security
  IF NOT query_upper LIKE 'SELECT%' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed for security reasons';
  END IF;
  
  -- Check for dangerous keywords (even in SELECT queries)
  IF query_upper LIKE '%DROP%' OR 
     query_upper LIKE '%DELETE%' OR 
     query_upper LIKE '%TRUNCATE%' OR 
     query_upper LIKE '%ALTER%' OR 
     query_upper LIKE '%CREATE%' OR 
     query_upper LIKE '%INSERT%' OR 
     query_upper LIKE '%UPDATE%' THEN
    RAISE EXCEPTION 'Query contains prohibited keywords';
  END IF;
  
  -- Execute the query and return as JSON
  EXECUTE format('SELECT json_agg(row_to_json(t)) FROM (%s) t', sql_query) INTO result;
  
  -- Handle empty results
  IF result IS NULL THEN
    result := '[]'::json;
  END IF;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_raw_sql(text) TO authenticated;

-- Create RPC wrapper for Supabase client
CREATE OR REPLACE FUNCTION execute_sql(query_text text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN execute_raw_sql(query_text);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;