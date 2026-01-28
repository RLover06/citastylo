import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RemindersService {
  constructor(private prisma: PrismaService) {}

  async scheduleAppointmentReminders(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        provider: {
          include: { user: true },
        },
      },
    });

    if (!appointment) {
      return;
    }

    const appointmentDateTime = new Date(
      `${appointment.date.toISOString().split('T')[0]}T${appointment.startTime}:00`,
    );

    // Recordatorio 24 horas antes
    const reminder24h = new Date(appointmentDateTime);
    reminder24h.setHours(reminder24h.getHours() - 24);

    // Recordatorio 2 horas antes
    const reminder2h = new Date(appointmentDateTime);
    reminder2h.setHours(reminder2h.getHours() - 2);

    const now = new Date();

    // Crear recordatorio para el cliente - 24h antes
    if (reminder24h > now) {
      await this.prisma.reminder.create({
        data: {
          appointmentId,
          userId: appointment.clientId,
          message: `Recordatorio: Tienes una cita de ${appointment.service} el ${appointment.date.toLocaleDateString()} a las ${appointment.startTime}`,
          scheduledFor: reminder24h,
        },
      });
    }

    // Crear recordatorio para el cliente - 2h antes
    if (reminder2h > now) {
      await this.prisma.reminder.create({
        data: {
          appointmentId,
          userId: appointment.clientId,
          message: `Recordatorio: Tu cita de ${appointment.service} es en 2 horas (${appointment.startTime})`,
          scheduledFor: reminder2h,
        },
      });
    }

    // Crear recordatorio para el prestador - 24h antes
    if (reminder24h > now) {
      await this.prisma.reminder.create({
        data: {
          appointmentId,
          userId: appointment.provider.userId,
          message: `Recordatorio: Tienes una cita con ${appointment.client.firstName} ${appointment.client.lastName} el ${appointment.date.toLocaleDateString()} a las ${appointment.startTime}`,
          scheduledFor: reminder24h,
        },
      });
    }

    // Crear recordatorio para el prestador - 2h antes
    if (reminder2h > now) {
      await this.prisma.reminder.create({
        data: {
          appointmentId,
          userId: appointment.provider.userId,
          message: `Recordatorio: Tienes una cita en 2 horas (${appointment.startTime}) con ${appointment.client.firstName} ${appointment.client.lastName}`,
          scheduledFor: reminder2h,
        },
      });
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async sendScheduledReminders() {
    const now = new Date();
    const reminders = await this.prisma.reminder.findMany({
      where: {
        isSent: false,
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        user: true,
        appointment: {
          include: {
            client: true,
            provider: {
              include: { user: true },
            },
          },
        },
      },
    });

    for (const reminder of reminders) {
      // Aquí se enviaría la notificación (email, push, WhatsApp, etc.)
      console.log(`📧 Enviando recordatorio a ${reminder.user.email}: ${reminder.message}`);
      
      // TODO: Integrar con servicio de notificaciones
      // - Email (SendGrid, AWS SES, etc.)
      // - Push notifications
      // - WhatsApp (cuando esté disponible)

      // Marcar como enviado
      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: { isSent: true, sentAt: now },
      });
    }
  }
}

