import {
  Controller, Get, Post, Patch,
  Param, Body, Query, UploadedFiles, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';

import { ResultService } from './result.service';
import { StorageClientService } from '../storage-client/storage-client.service';
import { PatientClientService } from '../patient-client/patient-client.service';
import { ArchiveService } from '../archive/archive.service';
import { UpdateResultInput } from './dto/update-result.input';
import { UpdateLabInput } from './dto/update-lab.input';
import { CreateResultWithLabInput } from './dto/create-result-with-lab.input';

@ApiTags('Results')
@Controller('results')
export class ResultController {
  constructor(
    private readonly service: ResultService,
    private readonly storageClient: StorageClientService,
    private readonly patientClient: PatientClientService,
    private readonly archiveService: ArchiveService,
  ) {}

  // ── GET ──
  @Get()
  @ApiOperation({ summary: 'Get all results (with patient info, filterable by search)' })
  async findAll(@Query('search') search?: string) {
    const results = await this.service.findAll(search);
    return Promise.all(results.map(async (r) => ({
      ...r,
      patient: r.patientId ? await this.patientClient.getPatient(r.patientId) : null,
    })));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a result by ID (with patient info)' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id') id: number) {
    const result = await this.service.findOne(id);
    const patient = result.patientId ? await this.patientClient.getPatient(result.patientId) : null;
    return { ...result, patient };
  }

  // ── CREATE ──
  @Post('with-lab')
  @ApiOperation({ summary: 'Create a result + lab result in one call' })
  createWithLab(@Body() input: CreateResultWithLabInput) {
    return this.service.createWithLab(input);
  }

  @Post('create-with-imaging/upload')
  @ApiOperation({ summary: 'Create result + upload multiple files + add imaging' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files:       { type: 'array', items: { type: 'string', format: 'binary' } },
        patientId:   { type: 'string', example: '41711ec5-7f87-4cbc-9200-55849a597dc0' },
        doctorId:    { type: 'string', example: '72d49761-2a65-446d-b025-15a74cac1ad4' },
        type:        { type: 'string', example: 'SCANNER' },
        description: { type: 'string', example: 'Radio thorax' },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files'))
  async createWithImagingUpload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('patientId') patientId: string,
    @Body('doctorId') doctorId: string,
    @Body('type') type: string,
    @Body('description') description: string,
    @Body('conclusion') conclusion: string,
    @Body('examenId') examenId: string,
    @Body('prescriberId') prescriberId: string,
  ) {
    return this.service.createWithImagingAndFiles(
      patientId, doctorId, type, description, conclusion,
      files, examenId, prescriberId,
    );
  }

  @Get('by-examen/:examenId')
  @ApiOperation({ summary: 'Get a result by examen ID' })
  @ApiParam({ name: 'examenId', type: String })
  async findByExamen(@Param('examenId') examenId: string) {
    const result = await this.service.findByExamen(examenId);
    if (!result) return null;
    const patient = result.patientId ? await this.patientClient.getPatient(result.patientId) : null;
    return { ...result, patient };
  }

  // ── UPDATE ──
  @Patch(':id')
  @ApiOperation({ summary: 'Update a result' })
  @ApiParam({ name: 'id', type: Number })
  async update(@Param('id') id: number, @Body() input: UpdateResultInput, @Body('examType') examType?: string) {
    const updated = await this.service.update(id, input);
    if (updated.description && updated.conclusion) {
      try {
        await this.archiveService.archiveFromResult(updated, examType);
      } catch { /* archive failure is non-blocking */ }
    }
    return updated;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update result status (PENDING / COMPLETE / CANCELLED)' })
  @ApiParam({ name: 'id', type: Number })
  updateStatus(@Param('id') id: number, @Body('status') status: string) {
    return this.service.updateStatus(id, status);
  }

  @Patch(':id/lab')
  @ApiOperation({ summary: 'Update the lab result of a result' })
  @ApiParam({ name: 'id', type: Number })
  async updateLab(@Param('id') id: number, @Body() input: UpdateLabInput) {
    const result = await this.service.findOne(id);
    if (!result.lab) throw new Error('No lab result to update');
    return this.service.updateLab(result.lab.id, input);
  }

  @Patch(':id/imaging/upload')
  @ApiOperation({ summary: 'Add images to an existing imaging result' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files'))
  async updateImagingUpload(
    @Param('id') id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const result = await this.service.findOne(id);
    if (!result.imaging) throw new Error('No imaging result to update');
    const urls = await Promise.all(
      files.map((f) =>
        this.storageClient.uploadFile(f.buffer, f.originalname, f.mimetype),
      ),
    );
    return this.service.updateImagingUrls(result.imaging.id, urls.map((u) => u.url));
  }
}
