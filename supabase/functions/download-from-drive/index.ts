import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { url, filename } = await req.json();

    if (!url) {
      throw new Error('URL is required');
    }

    console.log('Downloading from URL:', url);

    // Convert Dropbox URL to direct download
    let downloadUrl = url;
    if (url.includes('dropbox.com')) {
      downloadUrl = url.replace('dl=0', 'dl=1');
      console.log('Converted to direct Dropbox URL:', downloadUrl);
    }

    // Download the file using streaming to avoid memory issues
    const response = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    console.log('Content-Length:', contentLength);

    // Get the file as array buffer
    const arrayBuffer = await response.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);
    
    console.log('Downloaded file size:', fileData.length, 'bytes');

    // Generate filename
    const finalFilename = filename || `pitch-video-${Date.now()}.mp4`;
    const filePath = `pitch-videos/${finalFilename}`;

    console.log('Uploading to storage:', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('personalized-videos')
      .upload(filePath, fileData, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    console.log('Upload successful:', data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('personalized-videos')
      .getPublicUrl(filePath);

    console.log('Public URL:', urlData.publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: urlData.publicUrl,
        path: filePath,
        size: fileData.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
