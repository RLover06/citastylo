import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() createDto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(user.userId, createDto);
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.appointmentsService.findAll(user.userId, user.role);
  }

  @Get('available-slots')
  async getAvailableSlots(
    @Query('providerId') providerId: string,
    @Query('date') date: string,
  ) {
    return this.appointmentsService.getAvailableSlots(providerId, date);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.appointmentsService.findOne(id, user.userId, user.role);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, user.userId, user.role, updateDto);
  }
}


