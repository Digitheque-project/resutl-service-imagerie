import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class RapportHebdo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  dateFrom!: string;

  @Column({ type: 'date' })
  dateTo!: string;

  @Column()
  semaine!: number;

  @Column()
  annee!: number;

  @Column({ default: 'brouillon' })
  statut!: string;

  @Column({ type: 'jsonb' })
  data!: Record<string, unknown>;

  @Column({ nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
