import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RapportHebdo } from './rapport-hebdo.entity';
import { Result } from '../result/entities/result.entity';
import { PrescriptionClientService } from '../prescription-client/prescription-client.service';

@Injectable()
export class RapportHebdoService {
  private readonly logger = new Logger(RapportHebdoService.name);

  constructor(
    @InjectRepository(RapportHebdo)
    private readonly rapportRepo: Repository<RapportHebdo>,
    @InjectRepository(Result)
    private readonly resultRepo: Repository<Result>,
    private readonly prescriptionClient: PrescriptionClientService,
  ) {}

  private getWeekBounds(date: Date = new Date()): { from: string; to: string; semaine: number; annee: number } {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon...
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diffToMon);
    mon.setHours(0, 0, 0, 0);

    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);

    const getWeekNum = (dt: Date): number => {
      const start = new Date(dt.getFullYear(), 0, 1);
      const diff = dt.getTime() - start.getTime();
      return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
    };

    return {
      from: mon.toISOString().split('T')[0],
      to: sun.toISOString().split('T')[0],
      semaine: getWeekNum(mon),
      annee: mon.getFullYear(),
    };
  }

  async getCurrent(dateFrom?: string, dateTo?: string): Promise<any> {
    const bounds = dateFrom && dateTo ? { from: dateFrom, to: dateTo, semaine: 0, annee: 0 } : this.getWeekBounds();
    const from = bounds.from;
    const to = bounds.to;

    // Fetch exams from prescription-service (enriched with patient)
    const exams = await this.prescriptionClient.getExamsByDateRange(from, to);

    // Fetch results from local DB (prescription-service enrichment calls production API)
    const resultIds = exams
      .map((e: any) => e.idResult)
      .filter((id: any) => id != null)
      .map((id: any) => Number(id))
      .filter((id: number) => !isNaN(id));
    const results = resultIds.length > 0
      ? await this.resultRepo.find({ where: { id: In(resultIds) } })
      : [];
    const resultMap = new Map<number, Result>();
    for (const r of results) resultMap.set(r.id, r);

    const normalizeGender = (sexe: string | null | undefined): 'homme' | 'femme' | undefined => {
      const s = String(sexe ?? '').toLowerCase().trim();
      if (!s) return undefined;
      if (s.startsWith('f')) return 'femme';
      return 'homme';
    };

    const isFait = (exam: any): boolean => {
      if (exam.idResult == null) return false;
      const r = resultMap.get(Number(exam.idResult));
      if (!r) return false;
      if (!r.description?.trim()) return false;
      if (!r.conclusion?.trim()) return false;
      return true;
    };

    const total = exams.length;
    const realises = exams.filter((e) => isFait(e)).length;
    const nonRealises = total - realises;

    // Dernier rapport hebdomadaire généré
    const [lastRapport] = await this.rapportRepo.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });
    let dernierRapport = 'Aucun rapport pour le moment';
    if (lastRapport) {
      const d = new Date(lastRapport.createdAt);
      const diffMs = Date.now() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffH = Math.floor(diffMs / 3600000);
      const diffJ = Math.floor(diffMs / 86400000);
      if (diffJ > 0) dernierRapport = `il y a ${diffJ} jour${diffJ > 1 ? 's' : ''}`;
      else if (diffH > 0) dernierRapport = `il y a ${diffH} heure${diffH > 1 ? 's' : ''}`;
      else dernierRapport = `il y a ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
    }

    // Daily breakdown from exam.createdAt
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const quotidien = jours.map((jour, idx) => {
      const dayExams = exams.filter((e: any) => {
        const d = new Date(e.createdAt);
        return d.getDay() === (idx + 1) % 7;
      });
      return {
        jour,
        realise: dayExams.filter((e: any) => isFait(e)).length,
        non_realise: dayExams.filter((e: any) => !isFait(e)).length,
      };
    });

    // Modality breakdown from exam.examensType
    const modalitesMap = new Map<string, { realise: number; non_realise: number }>();
    for (const e of exams) {
      const type = e.examensType ?? 'Imagerie';
      if (!modalitesMap.has(type)) modalitesMap.set(type, { realise: 0, non_realise: 0 });
      const m = modalitesMap.get(type)!;
      if (isFait(e)) m.realise++;
      else m.non_realise++;
    }
    const modalites = Array.from(modalitesMap.entries()).map(([nom, v]) => ({ nom, ...v }));

    // Demographics from exam.patient (already enriched by prescription-service)
    const ageGroups = [
      { tranche: '0-14', min: 0, max: 14 },
      { tranche: '15-30', min: 15, max: 30 },
      { tranche: '31-45', min: 31, max: 45 },
      { tranche: '46-60', min: 46, max: 60 },
      { tranche: '61-75', min: 61, max: 75 },
      { tranche: '75+', min: 76, max: Infinity },
    ];
    const ageCount = ageGroups.map(() => 0);
    let hommes = 0;
    let femmes = 0;
    let enfants = 0;

    for (const e of exams) {
      const patient = e.patient;
      if (!patient) continue;

      let age: number | undefined;
      if (patient.dateNaissance) {
        const birthYear = new Date(patient.dateNaissance).getFullYear();
        if (!isNaN(birthYear)) age = new Date().getFullYear() - birthYear;
      }
      if (age === undefined && patient.age != null) {
        age = Number(patient.age);
      }

      const gender = normalizeGender(patient.sexe);

      if (age !== undefined && age <= 14) {
        enfants++;
      } else if (gender === 'homme') {
        hommes++;
      } else if (gender === 'femme') {
        femmes++;
      }

      if (age !== undefined) {
        const idx = ageGroups.findIndex((g) => age! >= g.min && age! <= g.max);
        if (idx >= 0) ageCount[idx]++;
      }
    }

    const tranchesAge = ageGroups.map((g, i) => ({
      tranche: g.tranche,
      nombre: ageCount[i],
    }));

    return {
      date_from: from,
      date_to: to,
      semaine: bounds.semaine,
      annee: bounds.annee,
      kpis: {
        total_examens: total,
        examens_realises: realises,
        examens_non_realises: nonRealises,
        dernier_rapport: dernierRapport,
      },
      quotidien,
      modalites,
      demographie: {
        hommes,
        femmes,
        enfants,
        tranches_age: tranchesAge,
      },
    };
  }

  async generate(): Promise<RapportHebdo> {
    const current = await this.getCurrent();
    const bounds = this.getWeekBounds();

    const rapport = this.rapportRepo.create({
      dateFrom: bounds.from,
      dateTo: bounds.to,
      semaine: bounds.semaine,
      annee: bounds.annee,
      statut: 'final',
      data: current as Record<string, unknown>,
    });

    return this.rapportRepo.save(rapport);
  }

  async findAll(): Promise<RapportHebdo[]> {
    return this.rapportRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<RapportHebdo> {
    const rapport = await this.rapportRepo.findOne({ where: { id } });
    if (!rapport) throw new NotFoundException('Rapport non trouvé');
    return rapport;
  }

  async checkAlert(): Promise<{ alert: boolean; message?: string }> {
    const bounds = this.getWeekBounds();
    const existing = await this.rapportRepo.findOne({
      where: { dateFrom: bounds.from, dateTo: bounds.to },
    });

    const now = new Date();
    const day = now.getDay(); // 0=Sun, 6=Sat
    const isAfterFriday = day >= 5; // Fri=5, Sat=6, Sun=0

    if (isAfterFriday && !existing) {
      return {
        alert: true,
        message: `Aucun rapport généré pour la semaine ${bounds.semaine} (${bounds.from} au ${bounds.to}). Veuillez générer le rapport hebdomadaire.`,
      };
    }

    return { alert: false };
  }
}
