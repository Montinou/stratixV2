import { NextRequest, NextResponse } from 'next/server';
import { getSafeUser } from '@/lib/stack-auth';
import { ImportService } from '@/lib/services/import-service';
import { TemplateService, TemplateType, TemplateFormat } from '@/lib/services/template-service';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated using safe wrapper
    const user = await getSafeUser();

    if (!user) {
      console.error('Template download failed: User not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as TemplateType;
    const format = (searchParams.get('format') || 'csv') as TemplateFormat;

    // Validate type
    if (!type || !['objectives', 'initiatives', 'activities', 'users'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid or missing template type. Valid types: objectives, initiatives, activities, users' },
        { status: 400 }
      );
    }

    // Validate format
    if (!['csv', 'xlsx'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Valid formats: csv, xlsx' },
        { status: 400 }
      );
    }

    // Get user permissions to check if they can download user templates
    const userPermissions = await ImportService.getUserPermissions(user.id);

    if (!userPermissions) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { role: userRole } = userPermissions as { role: string };

    // Check permission for user templates
    if (type === 'users' && userRole !== 'corporativo') {
      return NextResponse.json(
        { error: 'Only corporate users can download user templates' },
        { status: 403 }
      );
    }

    // Employees cannot download any templates
    if (userRole === 'empleado') {
      return NextResponse.json(
        { error: 'Los empleados no tienen permisos para descargar plantillas de importación' },
        { status: 403 }
      );
    }

    // Generate the template
    const templateContent = TemplateService.generateTemplate(type, format);

    // Set appropriate headers based on format
    const headers: HeadersInit = {};
    let contentType: string;
    let fileName: string;

    if (format === 'csv') {
      contentType = 'text/csv; charset=utf-8';
      fileName = `plantilla_${type}_${new Date().toISOString().split('T')[0]}.csv`;
      headers['Content-Type'] = contentType;
      headers['Content-Disposition'] = `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
      headers['Content-Encoding'] = 'UTF-8';

      // Add BOM for proper Excel UTF-8 recognition
      const bom = '\uFEFF';
      const contentWithBOM = bom + templateContent;

      return new NextResponse(contentWithBOM, {
        status: 200,
        headers,
      });
    } else {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileName = `plantilla_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
      headers['Content-Type'] = contentType;
      headers['Content-Disposition'] = `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;

      return new NextResponse(templateContent as Buffer, {
        status: 200,
        headers,
      });
    }
  } catch (error: any) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate template' },
      { status: 500 }
    );
  }
}

// Endpoint to get template metadata
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated using safe wrapper
    const user = await getSafeUser();

    if (!user) {
      console.error('Template metadata request failed: User not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body;

    // Validate type
    if (!type || !['objectives', 'initiatives', 'activities', 'users'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid or missing template type' },
        { status: 400 }
      );
    }

    // Get user permissions
    const userPermissions = await ImportService.getUserPermissions(user.id);

    if (!userPermissions) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { role: userRole } = userPermissions as { role: string };

    // Check permission for user templates
    if (type === 'users' && userRole !== 'corporativo') {
      return NextResponse.json(
        { error: 'Only corporate users can access user template information' },
        { status: 403 }
      );
    }

    // Employees cannot access template metadata
    if (userRole === 'empleado') {
      return NextResponse.json(
        { error: 'Los empleados no tienen permisos para acceder a información de plantillas' },
        { status: 403 }
      );
    }

    // Get template metadata
    const metadata = TemplateService.getTemplateMetadata(type as TemplateType);

    return NextResponse.json({
      success: true,
      metadata,
      formats: ['csv', 'xlsx'],
      downloadUrl: `/api/templates?type=${type}`,
    });
  } catch (error: any) {
    console.error('Template metadata error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get template metadata' },
      { status: 500 }
    );
  }
}