import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Archive } from './archive.entity';
import { PatientClientService } from '../patient-client/patient-client.service';
import { UserClientService } from '../user-client/user-client.service';
import { Result } from '../result/entities/result.entity';
import { ImagingResult } from '../result/entities/imaging-result.entity';

@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);

  constructor(
    @InjectRepository(Archive)
    private readonly archiveRepo: Repository<Archive>,
    private readonly patientClient: PatientClientService,
    private readonly userClient: UserClientService,
  ) {}

  async archiveFromResult(result: Result, examType?: string): Promise<Archive> {
    let patient: Record<string, unknown> | null = null;
    try {
      patient = await this.patientClient.getPatient(result.patientId);
    } catch {
      this.logger.warn(`Could not fetch patient ${result.patientId}`);
    }

    let patientAge: number | undefined;
    if (patient?.dateNaissance) {
      const birthYear = new Date(patient.dateNaissance as string).getFullYear();
      if (!isNaN(birthYear)) {
        patientAge = new Date().getFullYear() - birthYear;
      }
    }
    if (patientAge === undefined && patient?.age != null) {
      patientAge = Number(patient.age);
    }

    let prescriberFirstName: string | undefined;
    let prescriberLastName: string | undefined;
    if (result.prescriberId) {
      try {
        const user = await this.userClient.getUser(result.prescriberId);
        if (user) {
          prescriberFirstName = user.firstname;
          prescriberLastName = user.name;
        }
      } catch {
        this.logger.warn(`Could not fetch prescriber ${result.prescriberId}`);
      }
    }

    let examinerFirstName: string | undefined;
    let examinerLastName: string | undefined;
    if (result.doctorId) {
      try {
        const user = await this.userClient.getUser(result.doctorId);
        if (user) {
          examinerFirstName = user.firstname;
          examinerLastName = user.name;
        }
      } catch {
        this.logger.warn(`Could not fetch examiner ${result.doctorId}`);
      }
    }

    const imageUrls = result.imaging?.imageUrl ?? [];

    const archive = this.archiveRepo.create({
      patientId:   result.patientId,
      patientFirstName: patient?.firstName as string ?? patient?.prenom as string ?? undefined,
      patientLastName:  patient?.lastName as string ?? patient?.nom as string ?? undefined,
      patientAge,
      examType:     examType ?? result.type,
      date:         new Date().toISOString(),
      prescriberId: result.prescriberId,
      prescriberFirstName,
      prescriberLastName,
      examinerId:   result.doctorId ?? undefined,
      examinerFirstName,
      examinerLastName,
      resultId:     result.id,
      description:  result.description,
      conclusion:   result.conclusion,
      imageUrls:    imageUrls.length > 0 ? imageUrls : undefined,
      status:       result.status ?? 'COMPLETE',
    });

    return this.archiveRepo.save(archive);
  }

  private async enrichArchives(archives: Archive[]): Promise<Archive[]> {
    const cache = new Map<string, { firstname: string; name: string }>();
    for (const a of archives) {
      if (!a.prescriberFirstName && a.prescriberId && !cache.has(a.prescriberId)) {
        const user = await this.userClient.getUser(a.prescriberId);
        if (user) cache.set(a.prescriberId, { firstname: user.firstname ?? '', name: user.name ?? '' });
      }
      if (!a.examinerFirstName && a.examinerId && !cache.has(a.examinerId)) {
        const user = await this.userClient.getUser(a.examinerId);
        if (user) cache.set(a.examinerId, { firstname: user.firstname ?? '', name: user.name ?? '' });
      }
    }
    return archives.map((a) => {
      if (!a.prescriberFirstName && a.prescriberId && cache.has(a.prescriberId)) {
        const u = cache.get(a.prescriberId)!;
        a.prescriberFirstName = u.firstname;
        a.prescriberLastName = u.name;
      }
      if (!a.examinerFirstName && a.examinerId && cache.has(a.examinerId)) {
        const u = cache.get(a.examinerId)!;
        a.examinerFirstName = u.firstname;
        a.examinerLastName = u.name;
      }
      return a;
    });
  }

  async findAll(
    page?: number,
    limit?: number,
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
        '(a.patientFirstName LIKE :s OR a.patientLastName LIKE :s OR a.prescriberFirstName LIKE :s OR a.prescriberLastName LIKE :s OR a.examinerFirstName LIKE :s OR a.examinerLastName LIKE :s OR a.description LIKE :s OR a.conclusion LIKE :s OR CAST(a.id AS TEXT) LIKE :s)',
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
    if (page && limit) {
      qb.skip((page - 1) * limit).take(limit);
    }
    let data = await qb.getMany();

    data = await this.enrichArchives(data);

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
