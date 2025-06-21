/*
  # Secure Login Edge Function
  
  Handles location-based access control for CS role users.
  
  ## Workflow:
  1. CS user attempts login from new IP
  2. Function checks if IP is in allowed_ips table
  3. If not allowed, creates access_request record
  4. Returns pending status to show loading page
  5. Admin can approve/deny request from admin panel
  6. On approval, IP is added to allowed_ips and user gets access
  
  ## API Endpoints:
  - POST /secure-login - Check IP and handle CS login
  - GET /secure-login/status/:request_id - Check approval status
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface LoginRequest {
  email: string;
  password: string;
}

interface StatusRequest {
  request_id: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const path = url.pathname;

    // Handle status check requests
    if (req.method === 'GET' && path.includes('/status/')) {
      const requestId = path.split('/status/')[1];
      
      const { data: accessRequest, error } = await supabaseClient
        .from('access_requests')
        .select('status, resolved_at')
        .eq('id', requestId)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          status: accessRequest.status,
          resolved_at: accessRequest.resolved_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle login requests
    if (req.method === 'POST') {
      const { email, password }: LoginRequest = await req.json();

      // Get client IP address from request headers
      const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                        req.headers.get('x-real-ip') || 
                        'unknown';

      // First, attempt regular authentication
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user profile to check role
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role, full_name')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: 'Profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If user is ADMIN, allow login from any IP
      if (profile.role === 'ADMIN') {
        return new Response(
          JSON.stringify({
            success: true,
            user: authData.user,
            profile: profile,
            session: authData.session
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If user is CS, check IP restrictions
      if (profile.role === 'CS') {
        // Check if IP is in allowed list
        const { data: allowedIp, error: ipError } = await supabaseClient
          .from('allowed_ips')
          .select('id')
          .eq('ip_address', ip_address)
          .single();

        if (allowedIp) {
          // IP is allowed, grant access
          return new Response(
            JSON.stringify({
              success: true,
              user: authData.user,
              profile: profile,
              session: authData.session
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // IP not allowed, check if there's already a pending request
        const { data: existingRequest } = await supabaseClient
          .from('access_requests')
          .select('id, status')
          .eq('profile_id', authData.user.id)
          .eq('ip_address', ip_address)
          .eq('status', 'PENDING')
          .single();

        let requestId;

        if (existingRequest) {
          requestId = existingRequest.id;
        } else {
          // Create new access request
          const { data: newRequest, error: requestError } = await supabaseClient
            .from('access_requests')
            .insert({
              profile_id: authData.user.id,
              ip_address: ip_address,
              status: 'PENDING'
            })
            .select('id')
            .single();

          if (requestError) {
            return new Response(
              JSON.stringify({ error: 'Failed to create access request' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          requestId = newRequest.id;
        }

        // Return pending status
        return new Response(
          JSON.stringify({
            success: false,
            status: 'PENDING_APPROVAL',
            message: 'Access request pending admin approval',
            request_id: requestId
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Unknown role
      return new Response(
        JSON.stringify({ error: 'Invalid user role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Secure login error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});