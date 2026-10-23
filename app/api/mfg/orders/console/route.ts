import { NextRequest } from 'next/server';
import { handleConsoleTelemetry } from '@/lib/services/mfg/mfgConsoleService';

export async function GET(request: NextRequest) {
  return handleConsoleTelemetry(request);
}
