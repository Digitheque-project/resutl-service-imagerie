import {
  Controller, Get, Post, Patch,
  Param, Body, UploadedFiles, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';

import { ResultService } from './result.service';
import { StorageClientService } from '../storage-client/storage-client.service';
import { PatientClientService } from '../patient-client/patient-client.service';
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
  ) {}

  // ── GET ──
  @Get()
  @ApiOperation({ summary: 'Get all results (with patient info)' })
  async findAll() {
    const results = await this.service.findAll();
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
        doctorId:    { type: 'integer', example: 1 },
        description: { type: 'string', example: 'Radio thorax' },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files'))
  async createWithImagingUpload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('patientId') patientId: string,
    @Body('doctorId') doctorId: number,
    @Body('description') description: string,
  ) {
    return this.service.createWithImagingAndFiles(
      patientId, doctorId, description,
      files,
    );
  }

  // ── UPDATE ──
  @Patch(':id')
  @ApiOperation({ summary: 'Update a result' })
  @ApiParam({ name: 'id', type: Number })
  update(@Param('id') id: number, @Body() input: UpdateResultInput) {
    return this.service.update(id, input);
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
