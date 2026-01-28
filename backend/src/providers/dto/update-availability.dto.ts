import { IsString, IsBoolean, IsOptional, Matches } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime debe estar en formato HH:mm',
  })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime debe estar en formato HH:mm',
  })
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

