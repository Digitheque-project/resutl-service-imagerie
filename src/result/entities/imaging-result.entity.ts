import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Result } from './result.entity';

@Entity()
export class ImagingResult {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  description!: string;

  @Column({ nullable: true })
  resultId?: number;

  @Column("simple-array", { nullable: true })
  imageUrl?: string[];

  @Column({ nullable: true })
  fileUrl?: string;

  @OneToOne(() => Result, (result) => result.imaging)
  @JoinColumn()
  result!: Result;
}