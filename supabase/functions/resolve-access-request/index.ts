/*
  # Resolve Access Request Edge Function
  
  Allows admins to approve or deny CS user access requests.
  
  ## Workflow:
  1. Admin calls this function with request_id and action (APPROVE/DENY)
  2. Function updates access_request status
  3. If approved, adds IP to allowed_ips table
  4. Returns success/failure status
  
  ## API:
  - POST /resolve-access-request
    Body: { request_id: string, action: 'APPROVE' | 'DENY' }
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ResolveRequest {
  request_id: string;
  action: 'APPROVE' | 'DENY';
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is authenticated and is an admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'ADMIN') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { request_id, action }: ResolveRequest = await req.json();

    if (!request_id || !['APPROVE', 'DENY'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the access request details
    const { data: accessRequest, error: requestError } = await supabaseClient
      .from('access_requests')
      .select('profile_id, ip_address, status')
      .eq('id', request_id)
      .single();

    if (requestError || !accessRequest) {
      return new Response(
        JSON.stringify({ error: 'Access request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (accessRequest.status !== 'PENDING') {
      return new Response(
        JSON.stringify({ error: 'Request already resolved' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the access request status
    const { error: updateError } = await supabaseClient
      .from('access_requests')
      .update({
        status: action === 'APPROVE' ? 'APPROVED' : 'DENIED',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id
      })
      .eq('id', request_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If approved, add IP to allowed_ips table
    if (action === 'APPROVE') {
      const { error: ipError } = await supabaseClient
        .from('allowed_ips')
        .insert({
          ip_address: accessRequest.ip_address,
          description: `Auto-approved for CS user access`,
          created_by: user.id
        });

      if (ipError) {
        // Log error but don't fail the request - the approval was successful
        console.error('Failed to add IP to allowed list:', ipError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: action,
        message: `Access request ${action.toLowerCase()}d successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Resolve access request error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});