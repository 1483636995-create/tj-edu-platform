import { Controller, Get } from '@nestjs/common';

interface HealthPayload {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
}

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthPayload {
    return {
      status: 'ok',
      service: 'tj-edu-platform-api',
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString()
    };
  }
}
