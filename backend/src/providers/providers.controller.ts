import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateProviderProfileDto } from './dto/create-provider-profile.dto';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Controller('providers')
export class ProvidersController {
  constructor(private providersService: ProvidersService) {}

  @Get()
  async getAllProviders() {
    return this.providersService.getAllProviders();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser() user: any) {
    return this.providersService.getProfile(user.userId);
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  async createProfile(
    @CurrentUser() user: any,
    @Body() createDto: CreateProviderProfileDto,
  ) {
    return this.providersService.createProfile(user.userId, createDto);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateDto: UpdateProviderProfileDto,
  ) {
    return this.providersService.updateProfile(user.userId, updateDto);
  }

  @Get('availability')
  @UseGuards(JwtAuthGuard)
  async getAvailability(@CurrentUser() user: any) {
    return this.providersService.getAvailability(user.userId);
  }

  @Post('availability')
  @UseGuards(JwtAuthGuard)
  async createAvailability(
    @CurrentUser() user: any,
    @Body() createDto: CreateAvailabilityDto,
  ) {
    return this.providersService.createAvailability(user.userId, createDto);
  }

  @Put('availability/:id')
  @UseGuards(JwtAuthGuard)
  async updateAvailability(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateAvailabilityDto,
  ) {
    return this.providersService.updateAvailability(user.userId, id, updateDto);
  }
}

