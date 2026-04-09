import { IsArray, IsUUID } from 'class-validator';

export class ReorderListDto {
  @IsArray()
  @IsUUID('all', { each: true })
  orderedEntryIds: string[];
}
