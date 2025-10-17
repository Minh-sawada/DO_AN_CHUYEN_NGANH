// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

// @ts-ignore: remote Deno std library import used at runtime; suppress editor/tsc module resolution error
import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Tạo Supabase client với service role key
        const supabaseClient = createClient(
            process.env.SUPABASE_URL ?? '',
            process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
        )

        // 1. Kiểm tra xem auto backup có được bật không
        const { data: settings } = await supabaseClient
            .from('backup_settings')
            .select('*')
            .single()

        if (!settings?.auto_backup_enabled) {
            return new Response(
                JSON.stringify({ message: 'Auto backup is disabled' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Tạo backup mới
        const timestamp = new Date().toISOString()
        const filename = `backup-${timestamp}.json`

        // Export dữ liệu
        const { data: exportedData } = await supabaseClient.rpc('export_backup_data')
        
        // 3. Mã hóa dữ liệu (sử dụng encryption có sẵn của Supabase Storage)
        const encryptedData = JSON.stringify(exportedData)
        
        // 4. Upload lên Supabase Storage (convert to Blob for consistent upload)
        const body = new Blob([encryptedData], { type: 'application/json' })
        const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from('backups')
            .upload(filename, body, {
                contentType: 'application/json',
                upsert: false
            })

        if (uploadError) throw uploadError

        // 5. Cập nhật backup logs
        const { data: backupLog, error: logError } = await supabaseClient
            .from('backup_logs')
            .insert({
                backup_type: 'auto',  // Must be one of: 'manual', 'scheduled', 'auto'
                file_name: filename,
                file_size: encryptedData.length,
                status: 'success',
                completed_at: new Date().toISOString()
            })
            .select()
            .single()

        if (logError) throw logError

        // 6. Cleanup old backups
        await supabaseClient.rpc('cleanup_old_backups')

        return new Response(
            JSON.stringify({ 
                success: true, 
                message: 'Backup completed successfully',
                backupLog 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        return new Response(
            JSON.stringify({ 
                success: false, 
                error: error.message 
            }),
            { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})