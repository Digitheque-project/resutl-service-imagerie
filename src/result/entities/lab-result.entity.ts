import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
} from 'typeorm';

import { Result } from './result.entity';

@Entity()
export class LabResult {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  resultId!: number;

  @Column()
  testName!: string;

  @Column({ type: 'float', nullable: true })
  value?: number;

  @Column({ nullable: true })
  unit?: string;

  @Column({ nullable: true })
  referenceRange?: string;

  @Column({ nullable: true })
  notes?: string;

  @OneToOne(() => Result, (result) => result.lab)
  result!: Result;
}