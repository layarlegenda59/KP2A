import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { query_text } = await req.json()

    if (!query_text || typeof query_text !== 'string') {
      throw new Error('Invalid query provided')
    }

    // Basic security checks
    const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE']
    const upperQuery = query_text.toUpperCase()
    
    // Allow only SELECT queries for safety
    if (!upperQuery.trim().startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed for security reasons')
    }

    // Execute the query
    const { data, error } = await supabaseClient.rpc('execute_raw_sql', {
      sql_query: query_text
    })

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ data, error: null }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ data: null, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})