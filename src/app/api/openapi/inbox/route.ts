import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'KPU Digital Archive - Integration API',
    version: '1.0.0',
    description: 'OpenAPI publik integrasi. App type=app wajib x-integration-token + bearer user token. App type=bot cukup x-integration-token.'
  },
  paths: {
    '/api/integrations/health': {
      get: {
        tags: ['integration-auth'],
        summary: 'Health check integrasi + verifikasi token app',
        security: [{ integrationToken: [] }],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limit exceeded' }
        }
      }
    },
    '/api/integrations/auth/login': {
      post: {
        tags: ['integration-auth'],
        summary: 'Login user untuk mendapat bearer token user (dipakai app type=app)',
        security: [{ integrationToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nip', 'password'],
                properties: {
                  nip: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Success' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Invalid credentials / missing integration token' },
          '403': { description: 'Only app type can login' },
          '429': { description: 'Rate limit exceeded' }
        }
      }
    },
    '/api/integrations/files': {
      get: {
        tags: ['integration-files'],
        summary: 'List all file arsip aktif (all user + public), bisa pakai integration token atau bearer user token',
        security: [{ integrationToken: [] }, { userBearer: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'cursor', in: 'query', schema: { type: 'string' }, description: 'Opsional cursor pagination mode' }
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limit exceeded' }
        }
      }
    },
    '/api/integrations/uploads': {
      get: {
        tags: ['integration-uploads'],
        summary: 'List log upload (bisa pakai integration token atau bearer user token)',
        security: [{ integrationToken: [] }, { userBearer: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['processed', 'failed', 'ignored'] } },
          { name: 'sourceType', in: 'query', schema: { type: 'string', enum: ['group', 'dm', 'api', 'webhook'] } }
        ],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limit exceeded' }
        }
      },
      post: {
        tags: ['integration-uploads'],
        summary: 'Ingest media. appType=app butuh integration token + bearer user token. appType=bot cukup integration token.',
        security: [{ integrationToken: [], userBearer: [] }, { userBearer: [] }, { integrationToken: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  uploaderPhone: { type: 'string', description: 'Wajib untuk appType=bot. Untuk appType=app optional dan harus sama dengan user token phone jika diisi.' },
                  messageId: { type: 'string', maxLength: 120 },
                  sourceType: { type: 'string', enum: ['group', 'dm', 'api', 'webhook'], default: 'api' },
                  sourceId: { type: 'string' },
                  sourceName: { type: 'string' },
                  senderPhone: { type: 'string' },
                  senderName: { type: 'string' },
                  caption: { type: 'string' },
                  description: { type: 'string' },
                  tags: { type: 'string', description: 'Pisahkan dengan koma' },
                  private: { type: 'string', description: '1|true|on|yes = private' },
                  docNumber: { type: 'string' },
                  docDate: { type: 'string', format: 'date-time' },
                  unit: { type: 'string' },
                  docKind: { type: 'string' },
                  unitSender: { type: 'string' },
                  unitRecipient: { type: 'string' },
                  title: { type: 'string' },
                  subject: { type: 'string' },
                  year: { type: 'string' },
                  category: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Success' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized token' },
          '429': { description: 'Rate limit exceeded' },
          '413': { description: 'File too large' },
          '415': { description: 'Invalid mime type/content-type' }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      userBearer: {
        type: 'http',
        scheme: 'bearer'
      },
      integrationToken: {
        type: 'apiKey',
        in: 'header',
        name: 'x-integration-token'
      }
    }
  }
} as const;

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
