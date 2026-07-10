import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Result }        from './entities/result.entity';
import { LabResult }     from './entities/lab-result.entity';
import { ImagingResult } from './entities/imaging-result.entity';

import { StorageClientService } from '../storage-client/storage-client.service';

import { CreateResultInput }  from './dto/create-result.input';
import { CreateLabInput}      from './dto/create-lab.input';
import { CreateImagingInput } from './dto/create-imaging.input';
import { UpdateResultInput }  from './dto/update-result.input';
import { UpdateLabInput }     from './dto/update-lab.input';
import { UpdateImagingInput } from './dto/update-imaging.input';
import { ResultType } from './result.enums';

import { CreateResultWithLabInput }     from './dto/create-result-with-lab.input';
import { CreateResultWithImagingInput } from './dto/create-result-with-imaging.input';
import Multer from 'multer';

@Injectable()
export class ResultService {
  constructor(
    @InjectRepository(Result)
    private readonly resultRepo: Repository<Result>,

    @InjectRepository(LabResult)
    private readonly labRepo: Repository<LabResult>,

    @InjectRepository(ImagingResult)
    private readonly imagingRepo: Repository<ImagingResult>,

    private readonly storageClient: StorageClientService,
  ) {}

  // ── CREATE RESULT ────────────────────────────────────────
  async create(input: CreateResultInput): Promise<Result> {
    const result = this.resultRepo.create({
      patientId:    input.patientId,
      doctorId:     input.doctorId,
      type:         input.type,
      description:  input.description,
      conclusion:   input.conclusion,
      examenId:     input.examenId,
      prescriberId: input.prescriberId,
    });
    return this.resultRepo.save(result);
  }

  // ── FIND ALL ─────────────────────────────────────────────
  findAll(): Promise<Result[]> {
    return this.resultRepo.find({
      relations: { lab: true, imaging: true },
    });
  }

  // ── FIND ONE ─────────────────────────────────────────────
  async findOne(id: number): Promise<Result> {
    const result = await this.resultRepo.findOne({
      where: { id },
      relations: { lab: true, imaging: true },
    });
    if (!result) throw new NotFoundException(`Result #${id} not found`);
    return result;
  }

  // ── ADD LAB ──────────────────────────────────────────────
  async addLab(input: CreateLabInput): Promise<LabResult> {
    const result = await this.findOne(input.resultId);

    if (result.lab) {
      throw new Error(`Result #${input.resultId} already has a lab result`);
    }

    const lab = this.labRepo.create({
      resultId:       result.id,
      testName:       input.testName,
      value:          input.value,
      unit:           input.unit,
      referenceRange: input.referenceRange,
      notes:          input.notes,
    });

    const savedLab = await this.labRepo.save(lab);

    result.lab = savedLab;
    await this.resultRepo.save(result);

    return savedLab;
  }

  // ── ADD IMAGING ──────────────────────────────────────────
  async addImaging(input: CreateImagingInput): Promise<ImagingResult> {
    const result = await this.findOne(input.resultId);

    if (result.imaging) {
      throw new Error(`Result #${input.resultId} already has an imaging result`);
    }

    const imaging = this.imagingRepo.create({
      description: input.description,
      imageUrl:    input.imageUrl,
      fileUrl:     input.fileUrl,
      resultId:    result.id,
      result:      result,
    });

    const savedImaging = await this.imagingRepo.save(imaging);

    result.imaging = savedImaging;
    await this.resultRepo.save(result);

    return savedImaging;
  }

  // ── UPLOAD & ADD IMAGING ─────────────────────────────────
  async addImagingWithFile(
    input: CreateImagingInput,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<ImagingResult> {
    const { url } = await this.storageClient.uploadFile(fileBuffer, fileName, mimeType);

    if (!input.imageUrl) input.imageUrl = [];
    input.imageUrl.push(url);
    if (!input.fileUrl)  input.fileUrl  = url;

    return this.addImaging(input);
  }

  // ── UPDATE IMAGING WITH FILE ─────────────────────────────
  async updateImagingUrls(imagingId: number, urls: string[]): Promise<ImagingResult> {
    const imaging = await this.findOneImaging(imagingId);
    if (!imaging.imageUrl) imaging.imageUrl = [];
    imaging.imageUrl.push(...urls);
    return this.imagingRepo.save(imaging);
  }

  // ── UPDATE STATUS ────────────────────────────────────────
  async updateStatus(id: number, status: string): Promise<Result> {
    const result = await this.findOne(id);
    result.status = status as any;
    return this.resultRepo.save(result);
  }

  // ── DELETE ───────────────────────────────────────────────
  async remove(id: number): Promise<boolean> {
    const result = await this.findOne(id);
    await this.resultRepo.remove(result);
    return true;
  }

  // ── UPDATE RESULT ────────────────────────────────────────
  async update(id: number, input: UpdateResultInput): Promise<Result> {
    const result = await this.findOne(id);
    Object.assign(result, input);
    return this.resultRepo.save(result);
  }

  // ── LAB RESULTS ──────────────────────────────────────────
  findAllLab(): Promise<LabResult[]> {
    return this.labRepo.find({ relations: { result: true } });
  }

  async findOneLab(id: number): Promise<LabResult> {
    const lab = await this.labRepo.findOne({
      where: { id },
      relations: { result: true },
    });
    if (!lab) throw new NotFoundException(`LabResult #${id} not found`);
    return lab;
  }

  async updateLab(id: number, input: UpdateLabInput): Promise<LabResult> {
    const lab = await this.findOneLab(id);
    Object.assign(lab, input);
    return this.labRepo.save(lab);
  }

  async removeLab(id: number): Promise<boolean> {
    const lab = await this.findOneLab(id);
    await this.labRepo.remove(lab);
    return true;
  }

  // ── CREATE RESULT WITH LAB ───────────────────────────────
  async createWithLab(input: CreateResultWithLabInput): Promise<Result> {
    const result = await this.create(input);

    const lab = this.labRepo.create({
      resultId:       result.id,
      testName:       input.labData.testName,
      value:          input.labData.value,
      unit:           input.labData.unit,
      referenceRange: input.labData.referenceRange,
      notes:          input.labData.notes,
    });

    result.lab = await this.labRepo.save(lab);
    return this.resultRepo.save(result);
  }

  // ── CREATE RESULT WITH IMAGING ───────────────────────────
  async createWithImaging(input: CreateResultWithImagingInput): Promise<Result> {
    const result = await this.create(input);

    const imaging = this.imagingRepo.create({
      description: input.imagingData.description,
      imageUrl:    input.imagingData.imageUrl,
      fileUrl:     input.imagingData.fileUrl,
      resultId:    result.id,
      result:      result,
    });

    result.imaging = await this.imagingRepo.save(imaging);
    return this.resultRepo.save(result);
  }

  // ── CREATE RESULT WITH IMAGING + FILE UPLOAD ─────────────
  async createWithImagingAndFiles(
    patientId: string,
    doctorId: string,
    type: string,
    description: string | undefined,
    conclusion: string | undefined,
    files: Express.Multer.File[],
    examenId?: string,
    prescriberId?: string,
  ): Promise<Result> {
    const urls = await Promise.all(
      files.map((f) =>
        this.storageClient.uploadFile(f.buffer, f.originalname, f.mimetype),
      ),
    );

    return this.createWithImaging({
      patientId,
      doctorId,
      type: type as ResultType,
      description,
      conclusion,
      examenId,
      prescriberId,
      imagingData: {
        description: description || (files[0]?.originalname ?? ''),
        imageUrl: urls.map((u) => u.url),
      },
    });
  }

  async findByExamen(examenId: string): Promise<Result | null> {
    return this.resultRepo.findOne({
      where: { examenId },
      relations: { lab: true, imaging: true },
    });
  }

  // ── IMAGING RESULTS ──────────────────────────────────────
  findAllImaging(): Promise<ImagingResult[]> {
    return this.imagingRepo.find({ relations: { result: true } });
  }

  async findOneImaging(id: number): Promise<ImagingResult> {
    const imaging = await this.imagingRepo.findOne({
      where: { id },
      relations: { result: true },
    });
    if (!imaging) throw new NotFoundException(`ImagingResult #${id} not found`);
    return imaging;
  }

  async updateImaging(id: number, input: UpdateImagingInput): Promise<ImagingResult> {
    const imaging = await this.findOneImaging(id);
    Object.assign(imaging, input);
    return this.imagingRepo.save(imaging);
  }

  async removeImaging(id: number): Promise<boolean> {
    const imaging = await this.findOneImaging(id);
    await this.imagingRepo.remove(imaging);
    return true;
  }
}