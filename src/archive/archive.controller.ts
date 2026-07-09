import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ArchiveService } from './archive.service';

@ApiTags('Archives')
@Controller()
export class ArchiveController {
  constructor(private readonly service: ArchiveService) {}

  @Get('archives')
  @ApiOperation({ summary: 'List archived results (paginated, filterable)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'prescripteur', required: false })
  @ApiQuery({ name: 'examinateur', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '8',
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('prescripteur') prescripteur?: string,
    @Query('examinateur') examinateur?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const { data, total } = await this.service.findAll(
      +page, +limit, { search, type, prescripteur, examinateur, dateFrom, dateTo },
    );

    const mapped = data.map((a) => ({
      id: `ARCH-${String(a.id).padStart(4, '0')}`,
      patient: {
        id: a.patientId,
        firstName: a.patientFirstName ?? 'Inconnu',
        lastName: a.patientLastName ?? '',
        age: a.patientAge,
      },
      type: a.examType ?? 'Imagerie',
      date: a.date,
      prescriber: {
        id: a.prescriberId ?? '',
        firstName: a.prescriberFirstName ?? 'Dr.',
        lastName: a.prescriberLastName ?? 'Inconnu',
        specialty: a.examType ?? '',
      },
      examiner: {
        id: a.examinerId ?? '',
        firstName: a.examinerFirstName ?? 'Dr.',
        lastName: a.examinerLastName ?? 'Inconnu',
        specialty: a.examType ?? '',
      },
      result: {
        id: String(a.resultId),
        description: a.description ?? '',
        fileUrl: a.imageUrls?.[0] ?? null,
        status: a.status,
      },
    }));

    return {
      data: mapped,
      pagination: {
        page: +page,
        limit: +limit,
        totalItems: total,
        totalPages: Math.ceil(total / +limit),
      },
    };
  }

  @Get('archive/types')
  @ApiOperation({ summary: 'Distinct exam types from archives' })
  async getTypes() {
    return this.service.getTypes();
  }

  @Get('archive/prescribers')
  @ApiOperation({ summary: 'Distinct prescriber names from archives' })
  async getPrescribers() {
    return this.service.getPrescribers();
  }

  @Get('archive/examiners')
  @ApiOperation({ summary: 'Distinct examiner names from archives' })
  async getExaminers() {
    return this.service.getExaminers();
  }

  @Get('archive/stats')
  @ApiOperation({ summary: 'Archive statistics (total exams, total patients)' })
  async getStats() {
    return this.service.getStats();
  }
}
