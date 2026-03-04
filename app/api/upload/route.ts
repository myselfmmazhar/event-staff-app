import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

        const buffer = Buffer.from(await file.arrayBuffer());
        const uniqueSuffix = crypto.randomUUID();
        const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, '');
        const filename = `${uniqueSuffix}-${originalName}`;

        // Define local storage path
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'temp');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, buffer);

        // Return the absolute path for backend use and relative URL for frontend preview if needed
        return NextResponse.json({
            url: `/uploads/temp/${filename}`,
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
