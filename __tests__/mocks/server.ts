import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock handlers for API routes
export const handlers = [
  // Health check endpoint
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  }),

  http.get('/api/health/live', () => {
    return HttpResponse.json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  }),

  http.get('/api/health/ready', () => {
    return HttpResponse.json({
      status: 'ready',
      checks: {
        database: 'healthy',
        cache: 'healthy',
      },
      timestamp: new Date().toISOString(),
    });
  }),

  http.get('/api/metrics', () => {
    return HttpResponse.text('# Mock metrics\n');
  }),

  // Mock OpenAI API
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a mock response from OpenAI API.',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    });
  }),
];

// Create MSW server
export const server = setupServer(...handlers);
