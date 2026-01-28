import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProviderProfileDto } from './dto/create-provider-profile.dto';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async createProfile(userId: string, createDto: CreateProviderProfileDto) {
    // Verificar que el usuario no tenga ya un perfil
    const existing = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ForbiddenException('Ya tienes un perfil de prestador');
    }

    return this.prisma.providerProfile.create({
      data: {
        userId,
        ...createDto,
      },
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
        availability: true,
      },
    });
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
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
        availability: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil de prestador no encontrado');
    }

    return profile;
  }

  async updateProfile(userId: string, updateDto: UpdateProviderProfileDto) {
    const profile = await this.getProfile(userId);
    
    return this.prisma.providerProfile.update({
      where: { id: profile.id },
      data: updateDto,
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
        availability: true,
      },
    });
  }

  async getAllProviders() {
    return this.prisma.providerProfile.findMany({
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
        availability: {
          where: { isActive: true },
        },
      },
    });
  }

  async createAvailability(userId: string, createDto: CreateAvailabilityDto) {
    const profile = await this.getProfile(userId);
    
    return this.prisma.availability.upsert({
      where: {
        providerId_dayOfWeek: {
          providerId: profile.id,
          dayOfWeek: createDto.dayOfWeek,
        },
      },
      update: {
        startTime: createDto.startTime,
        endTime: createDto.endTime,
        isActive: true,
      },
      create: {
        providerId: profile.id,
        ...createDto,
      },
    });
  }

  async updateAvailability(
    userId: string,
    availabilityId: string,
    updateDto: UpdateAvailabilityDto,
  ) {
    const profile = await this.getProfile(userId);
    
    const availability = await this.prisma.availability.findUnique({
      where: { id: availabilityId },
    });

    if (!availability || availability.providerId !== profile.id) {
      throw new NotFoundException('Disponibilidad no encontrada');
    }

    return this.prisma.availability.update({
      where: { id: availabilityId },
      data: updateDto,
    });
  }

  async getAvailability(userId: string) {
    const profile = await this.getProfile(userId);
    
    return this.prisma.availability.findMany({
      where: { providerId: profile.id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }
}

