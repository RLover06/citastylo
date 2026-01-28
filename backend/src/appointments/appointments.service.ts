import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RemindersService } from '../reminders/reminders.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private remindersService: RemindersService,
  ) {}

  async create(clientId: string, createDto: CreateAppointmentDto) {
    // Verificar que el prestador existe
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: createDto.providerId },
      include: { availability: true },
    });

    if (!provider) {
      throw new NotFoundException('Prestador no encontrado');
    }

    // Verificar disponibilidad en el día
    const appointmentDate = new Date(createDto.date);
    const dayOfWeek = appointmentDate.getDay();
    
    const dayAvailability = provider.availability.find(
      (av) => av.dayOfWeek === dayOfWeek && av.isActive,
    );

    if (!dayAvailability) {
      throw new ConflictException('El prestador no está disponible este día');
    }

    // Verificar que la hora esté dentro del rango disponible
    if (
      createDto.startTime < dayAvailability.startTime ||
      createDto.endTime > dayAvailability.endTime
    ) {
      throw new ConflictException('La hora está fuera del rango disponible');
    }

    // Verificar conflictos con otras citas
    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        providerId: createDto.providerId,
        date: appointmentDate,
        status: {
          not: AppointmentStatus.CANCELLED,
        },
        OR: [
          {
            AND: [
              { startTime: { lte: createDto.startTime } },
              { endTime: { gt: createDto.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: createDto.endTime } },
              { endTime: { gte: createDto.endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: createDto.startTime } },
              { endTime: { lte: createDto.endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingAppointment) {
      throw new ConflictException('Ya existe una cita en este horario');
    }

    // Crear la cita
    const appointment = await this.prisma.appointment.create({
      data: {
        clientId,
        providerId: createDto.providerId,
        date: appointmentDate,
        startTime: createDto.startTime,
        endTime: createDto.endTime,
        service: createDto.service,
        notes: createDto.notes,
      },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    // Crear recordatorios automáticos
    await this.remindersService.scheduleAppointmentReminders(appointment.id);

    return appointment;
  }

  async findAll(userId: string, role: string) {
    const where =
      role === 'PROVIDER'
        ? { provider: { userId } }
        : { clientId: userId };

    return this.prisma.appointment.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    // Verificar permisos
    if (role === 'CLIENT' && appointment.clientId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver esta cita');
    }

    if (role === 'PROVIDER' && appointment.provider.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver esta cita');
    }

    return appointment;
  }

  async update(
    id: string,
    userId: string,
    role: string,
    updateDto: UpdateAppointmentDto,
  ) {
    const appointment = await this.findOne(id, userId, role);

    // Solo el cliente puede cancelar, el prestador puede confirmar/completar
    if (updateDto.status === AppointmentStatus.CANCELLED && role !== 'CLIENT') {
      throw new ForbiddenException('Solo el cliente puede cancelar citas');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: updateDto,
      include: {
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  }

  async getAvailableSlots(providerId: string, date: string) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: { availability: true },
    });

    if (!provider) {
      throw new NotFoundException('Prestador no encontrado');
    }

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();

    const dayAvailability = provider.availability.find(
      (av) => av.dayOfWeek === dayOfWeek && av.isActive,
    );

    if (!dayAvailability) {
      return [];
    }

    // Obtener citas existentes para ese día
    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        providerId,
        date: appointmentDate,
        status: {
          not: AppointmentStatus.CANCELLED,
        },
      },
    });

    // Generar slots disponibles (cada 30 minutos)
    const slots: string[] = [];
    const [startHour, startMin] = dayAvailability.startTime.split(':').map(Number);
    const [endHour, endMin] = dayAvailability.endTime.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMin < endMin)
    ) {
      const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      
      // Verificar si hay conflicto
      const hasConflict = existingAppointments.some((apt) => {
        return (
          (timeString >= apt.startTime && timeString < apt.endTime) ||
          (timeString < apt.startTime && `${currentHour}:${currentMin + 30}` > apt.startTime)
        );
      });

      if (!hasConflict) {
        slots.push(timeString);
      }

      // Avanzar 30 minutos
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour += 1;
      }
    }

    return slots;
  }
}

