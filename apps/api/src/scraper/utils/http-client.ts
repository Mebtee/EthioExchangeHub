import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HttpClientOptions {
  url: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface HttpClientResult {
  html: string;
  contentType: string;
  statusCode: number;
  url: string;
}

@Injectable()
export class HttpClientService {
  private readonly defaultTimeout: number;

  constructor(configService: ConfigService) {
    this.defaultTimeout = configService.get<number>('scraper.requestTimeout', 30_000);
  }

  async fetch(options: HttpClientOptions): Promise<HttpClientResult> {
    const { url, timeout = this.defaultTimeout, headers = {} } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          ...headers,
        },
      });

      const contentType = response.headers.get('content-type') ?? 'text/html';
      const html = await response.text();

      return {
        html,
        contentType,
        statusCode: response.status,
        url: response.url,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
