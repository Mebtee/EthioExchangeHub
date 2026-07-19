import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Full-text search across banks, currencies, and services' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results per category' })
  async search(@Query('q') query: string, @Query('limit') limit?: string) {
    if (!query || query.trim().length === 0) {
      return { data: { banks: [], currencies: [], services: [] } };
    }
    return this.searchService.search(query.trim(), limit ? parseInt(limit, 10) : 5);
  }

  @Get('suggestions')
  @Public()
  @ApiOperation({ summary: 'Get quick search suggestions (autocomplete)' })
  async suggestions(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return { data: [] };
    }
    return this.searchService.getSuggestions(query.trim());
  }
}
