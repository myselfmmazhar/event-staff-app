import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            );
        }

        const uniqueSuffix = crypto.randomUUID();
        const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, '');
        const filename = `${uniqueSuffix}-${originalName}`;

        // On Vercel: use Blob storage (persistent, no local filesystem)
        if (process.env.VERCEL) {
            const blob = await put(filename, file, {
                access: 'public',
                addRandomSuffix: false,
            });

            return NextResponse.json({
                url: blob.url,
                name: file.name,
                type: file.type,
                size: file.size,
            });
        }

        // Local / non-serverless: save to disk in public/uploads
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, buffer);

        return NextResponse.json({
            url: `/uploads/${filename}`,
            absolutePath: filePath,
            name: file.name,
            type: file.type,
            size: file.size,
        });
    } catch (error) {
        console.error('Local upload error:', error);
        return NextResponse.json(
            { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
