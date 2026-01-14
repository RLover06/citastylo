import { IsString, IsDateString, IsOptional } from 'class-validator';
import { Matches } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  providerId: string;

  @IsDateString()
  date: string;

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime debe estar en formato HH:mm',
  })
  startTime: string;

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime debe estar en formato HH:mm',
  })
  endTime: string;

  @IsString()
  service: string;

  @IsOptional()
  @IsString()
  notes?: string;
}


