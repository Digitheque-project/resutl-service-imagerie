import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';

import { ResultType, ResultStatus } from '../result.enums';
import { LabResult }     from './lab-result.entity';
import { ImagingResult } from './imaging-result.entity';

@Entity()
export class Result {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  patientId!: string;

  @Column({ type: 'varchar', nullable: true })
  doctorId!: string | null;

  @Column({ type: 'enum', enum: ResultType })
  type!: ResultType;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  conclusion?: string;

  @Column({ nullable: true })
  examenId?: string;

  @Column({ nullable: true })
  prescriberId?: string;

  @Column({
    type: 'enum',
    enum: ResultStatus,
    default: ResultStatus.PENDING,
  })
  status!: ResultStatus;

  @OneToOne(() => LabResult, (lab) => lab.result, { cascade: true, eager: true })
  @JoinColumn()
  lab?: LabResult;

  @OneToOne(() => ImagingResult, (img) => img.result, { cascade: true, eager: true })
  @JoinColumn()
  imaging?: ImagingResult;
}