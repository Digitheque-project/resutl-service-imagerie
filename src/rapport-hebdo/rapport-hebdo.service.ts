import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { RapportHebdo } from './rapport-hebdo.entity';
import { Archive } from '../archive/archive.entity';
import { PatientClientService } from '../patient-client/patient-client.service';

@Injectable()
export class RapportHebdoService {
  private readonly logger = new Logger(RapportHebdoService.name);

  constructor(
    @InjectRepository(RapportHebdo)
    private readonly rapportRepo: Repository<RapportHebdo>,
    @InjectRepository(Archive)
    private readonly archiveRepo: Repository<Archive>,
    private readonly patientClient: PatientClientService,
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

    const archives = await this.archiveRepo.find({
      where: { date: Between(from, to + 'T23:59:59.999Z') },
    });

    // ── Fetch patient data for demographics ──
    const patientIds = [...new Set(archives.map((a) => a.patientId).filter(Boolean))];
    const patientMap = new Map<string, { sexe?: string; dateNaissance?: string }>();
    if (patientIds.length > 0) {
      const results = await Promise.allSettled(patientIds.map((id) => this.patientClient.getPatient(id)));
      for (let i = 0; i < patientIds.length; i++) {
        const r = results[i];
        if (r.status === 'fulfilled' && r.value) {
          patientMap.set(patientIds[i], {
            sexe: (r.value.sexe as string) ?? '',
            dateNaissance: r.value.dateNaissance as string,
          });
        }
      }
    }

    const normalizeGender = (sexe: string | null | undefined): 'homme' | 'femme' | undefined => {
      const s = String(sexe ?? '').toLowerCase().trim();
      if (!s) return undefined;
      if (s.startsWith('f')) return 'femme';
      return 'homme';
    };

    const total = archives.length;
    const realises = archives.filter((a) => a.status === 'COMPLETE' || a.status === 'VALIDATED').length;
    const nonRealises = total - realises;

    // Dernier rapport complété
    const completedSorted = [...archives]
      .filter((a) => a.status === 'COMPLETE' || a.status === 'VALIDATED')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    let dernierRapport = 'Aucun rapport';
    if (completedSorted.length > 0) {
      const d = new Date(completedSorted[0].createdAt);
      const diffMs = Date.now() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffH = Math.floor(diffMs / 3600000);
      const diffJ = Math.floor(diffMs / 86400000);
      if (diffJ > 0) dernierRapport = `il y a ${diffJ} jour${diffJ > 1 ? 's' : ''}`;
      else if (diffH > 0) dernierRapport = `il y a ${diffH} heure${diffH > 1 ? 's' : ''}`;
      else dernierRapport = `il y a ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
    }

    // Daily breakdown
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const quotidien = jours.map((jour, idx) => {
      const dayArchives = archives.filter((a) => {
        const d = new Date(a.date);
        return d.getDay() === (idx + 1) % 7;
      });
      return {
        jour,
        realise: dayArchives.filter((a) => a.status === 'COMPLETE' || a.status === 'VALIDATED').length,
        non_realise: dayArchives.filter((a) => a.status !== 'COMPLETE' && a.status !== 'VALIDATED').length,
      };
    });

    // Modality breakdown
    const modalitesMap = new Map<string, { realise: number; non_realise: number }>();
    for (const a of archives) {
      const type = a.examType ?? 'Imagerie';
      if (!modalitesMap.has(type)) modalitesMap.set(type, { realise: 0, non_realise: 0 });
      const m = modalitesMap.get(type)!;
      if (a.status === 'COMPLETE' || a.status === 'VALIDATED') m.realise++;
      else m.non_realise++;
    }
    const modalites = Array.from(modalitesMap.entries()).map(([nom, v]) => ({ nom, ...v }));

    // ── Demographics ──
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

    for (const a of archives) {
      // Determine age (archive patientAge, or fallback to patient API dateNaissance)
      let age: number | undefined = a.patientAge ?? undefined;
      const p = patientMap.get(a.patientId);
      if (age === undefined && p?.dateNaissance) {
        const birthYear = new Date(p.dateNaissance).getFullYear();
        if (!isNaN(birthYear)) age = new Date().getFullYear() - birthYear;
      }

      // Classify: enfant (0-14) overrides gender; homme/femme from sexe for adults
      if (age !== undefined && age <= 14) {
        enfants++;
      } else if (p?.sexe) {
        const gender = normalizeGender(p.sexe);
        if (gender === 'homme') hommes++;
        else if (gender === 'femme') femmes++;
      }

      // Age distribution
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
