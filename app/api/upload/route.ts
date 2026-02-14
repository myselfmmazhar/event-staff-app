import { NextRequest, NextResponse } from 'next/server';

// Valid bucket names for file uploads
type BucketName = 'profile-photos' | 'event-documents' | 'staff-documents';

const VALID_BUCKETS: BucketName[] = ['profile-photos', 'event-documents', 'staff-documents'];

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const bucketParam = formData.get('bucket') as string | null;

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            );
        }

        // Determine which bucket to use (default to profile-photos for backwards compatibility)
        const bucket: BucketName = bucketParam && VALID_BUCKETS.includes(bucketParam as BucketName)
            ? (bucketParam as BucketName)
            : 'profile-photos';

        // Check if Supabase is configured
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseServiceKey) {
            // Upload to Supabase Storage using service role key (bypasses RLS)
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(supabaseUrl, supabaseServiceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });

            const uniqueSuffix = crypto.randomUUID();
            const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, '');
            const filename = `${uniqueSuffix}-${originalName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filename, file);

            if (uploadError) {
                console.error('Supabase upload error:', uploadError);
                throw new Error('Failed to upload to storage');
            }

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filename);

            return NextResponse.json({
                url: publicUrl,
                name: file.name,
                type: file.type,
                size: file.size,
            });
        }

        // No Supabase configured
        return NextResponse.json(
            { error: 'Storage service not configured' },
            { status: 500 }
        );
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Upload failed' },
            { status: 500 }
        );
    }
}
