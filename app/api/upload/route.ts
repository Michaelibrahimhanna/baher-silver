import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      // Fallback if JSON payload sent
      const body = await request.json().catch(() => null);
      if (body?.url) {
        return NextResponse.json({ success: true, url: body.url });
      }
      return NextResponse.json({ success: false, error: 'No image file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const permanentDataUrl = `data:${mimeType};base64,${base64Data}`;

    return NextResponse.json({
      success: true,
      filename: file.name,
      size: file.size,
      url: permanentDataUrl,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to process file';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
