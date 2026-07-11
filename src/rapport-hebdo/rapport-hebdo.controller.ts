import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { RapportHebdoService } from './rapport-hebdo.service';

@ApiTags('Rapport Hebdo Imagerie')
@Controller()
export class RapportHebdoController {
  constructor(private readonly service: RapportHebdoService) {}

  @Get('rapport/hebdo/current')
  @ApiOperation({ summary: 'Données agrégées de la semaine active (ou période spécifique)' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Début de période (AAAA-MM-JJ)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Fin de période (AAAA-MM-JJ)' })
  async getCurrent(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getCurrent(dateFrom, dateTo);
  }

  @Post('rapport/hebdo/generate')
  @ApiOperation({ summary: 'Générer et stocker un nouveau rapport hebdomadaire (snapshot)' })
  async generate() {
    return this.service.generate();
  }

  @Get('rapport/hebdo')
  @ApiOperation({ summary: 'Liste de tous les rapports hebdomadaires stockés' })
  async findAll() {
    return this.service.findAll();
  }

  @Get('rapport/hebdo/:id')
  @ApiOperation({ summary: 'Détail d\'un rapport hebdomadaire stocké' })
  @ApiParam({ name: 'id', description: 'UUID du rapport' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get('rapport/hebdo/alert')
  @ApiOperation({ summary: 'Vérifier si un rapport doit être généré (alerte si après vendredi sans rapport)' })
  async checkAlert() {
    return this.service.checkAlert();
  }
}
