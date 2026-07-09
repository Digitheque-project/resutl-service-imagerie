import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Archive {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  patientId!: string;

  @Column({ nullable: true })
  patientFirstName?: string;

  @Column({ nullable: true })
  patientLastName?: string;

  @Column({ nullable: true })
  patientAge?: number;

  @Column({ nullable: true })
  examType?: string;

  @Column()
  date!: string;

  @Column({ nullable: true })
  prescriberId?: string;

  @Column({ nullable: true })
  prescriberFirstName?: string;

  @Column({ nullable: true })
  prescriberLastName?: string;

  @Column({ nullable: true })
  examinerId?: string;

  @Column({ nullable: true })
  examinerFirstName?: string;

  @Column({ nullable: true })
  examinerLastName?: string;

  @Column()
  resultId!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  conclusion?: string;

  @Column('simple-array', { nullable: true })
  imageUrls?: string[];

  @Column({ default: 'completed' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
