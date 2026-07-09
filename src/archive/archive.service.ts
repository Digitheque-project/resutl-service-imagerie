import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Archive } from './archive.entity';
import { PatientClientService } from '../patient-client/patient-client.service';
import { Result } from '../result/entities/result.entity';
import { ImagingResult } from '../result/entities/imaging-result.entity';

@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);

  constructor(
    @InjectRepository(Archive)
    private readonly archiveRepo: Repository<Archive>,
    private readonly patientClient: PatientClientService,
  ) {}

  async archiveFromResult(result: Result): Promise<Archive> {
    let patient: Record<string, unknown> | null = null;
    try {
      patient = await this.patientClient.getPatient(result.patientId);
    } catch {
      this.logger.warn(`Could not fetch patient ${result.patientId}`);
    }

    const imageUrls = result.imaging?.imageUrl ?? [];

    const archive = this.archiveRepo.create({
      patientId:   result.patientId,
      patientFirstName: patient?.firstName as string ?? patient?.prenom as string ?? undefined,
      patientLastName:  patient?.lastName as string ?? patient?.nom as string ?? undefined,
      patientAge:       patient?.age as number ?? undefined,
      examType:     result.type,
      date:         new Date().toISOString(),
      prescriberId: result.prescriberId,
      examinerId:   result.doctorId ?? undefined,
      resultId:     result.id,
      description:  result.description,
      conclusion:   result.conclusion,
      imageUrls:    imageUrls.length > 0 ? imageUrls : undefined,
      status:       result.status ?? 'completed',
    });

    return this.archiveRepo.save(archive);
  }

  async findAll(
    page: number,
    limit: number,
    filters?: {
      search?: string;
      type?: string;
      prescripteur?: string;
      examinateur?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Promise<{ data: Archive[]; total: number }> {
    const qb = this.archiveRepo.createQueryBuilder('a');

    if (filters?.search && filters.search.length >= 2) {
      const s = `%${filters.search}%`;
      qb.andWhere(
        '(a.patientFirstName LIKE :s OR a.patientLastName LIKE :s OR a.prescriberLastName LIKE :s OR a.examinerLastName LIKE :s OR CAST(a.id AS TEXT) LIKE :s)',
        { s },
      );
    }

    if (filters?.type) {
      qb.andWhere('a.examType = :type', { type: filters.type });
    }

    if (filters?.prescripteur) {
      qb.andWhere(
        "CONCAT(a.prescriberFirstName, ' ', a.prescriberLastName) LIKE :p",
        { p: `%${filters.prescripteur}%` },
      );
    }

    if (filters?.examinateur) {
      qb.andWhere(
        "CONCAT(a.examinerFirstName, ' ', a.examinerLastName) LIKE :e",
        { e: `%${filters.examinateur}%` },
      );
    }

    if (filters?.dateFrom) {
      qb.andWhere('a.date >= :from', { from: new Date(filters.dateFrom).toISOString() });
    }

    if (filters?.dateTo) {
      qb.andWhere('a.date <= :to', { to: new Date(filters.dateTo).toISOString() });
    }

    qb.orderBy('a.createdAt', 'DESC');

    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * limit).take(limit).getMany();

    return { data, total };
  }

  async getTypes(): Promise<string[]> {
    const result = await this.archiveRepo
      .createQueryBuilder('a')
      .select('DISTINCT a.examType', 'type')
      .where('a.examType IS NOT NULL')
      .getRawMany();
    return result.map((r: { type: string }) => r.type).filter(Boolean);
  }

  async getPrescribers(): Promise<string[]> {
    const result = await this.archiveRepo
      .createQueryBuilder('a')
      .select("DISTINCT CONCAT(a.prescriberFirstName, ' ', a.prescriberLastName)", 'name')
      .where('a.prescriberFirstName IS NOT NULL')
      .getRawMany();
    return result.map((r: { name: string }) => r.name).filter(Boolean);
  }

  async getExaminers(): Promise<string[]> {
    const result = await this.archiveRepo
      .createQueryBuilder('a')
      .select("DISTINCT CONCAT(a.examinerFirstName, ' ', a.examinerLastName)", 'name')
      .where('a.examinerFirstName IS NOT NULL')
      .getRawMany();
    return result.map((r: { name: string }) => r.name).filter(Boolean);
  }

  async getStats(): Promise<{ totalExams: number; totalPatients: number }> {
    const totalExams = await this.archiveRepo.count();
    const result = await this.archiveRepo
      .createQueryBuilder('a')
      .select('COUNT(DISTINCT a.patientId)', 'cnt')
      .getRawOne();
    return { totalExams, totalPatients: Number(result?.cnt ?? 0) };
  }
}
