import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('seed_state')
export class SeedState {
  @PrimaryColumn()
  id: number;

  @Column({ default: 0 })
  cursor: number;

  @Column({ default: 0 })
  totalInserted: number;

  @Column({ nullable: true, type: 'timestamp' })
  lastRunAt: Date | null;
}
