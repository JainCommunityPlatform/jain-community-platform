import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { AuthenticationGuard } from '../auth/authentication.guard';
import { AuthorizationGuard } from '../authorization/authorization.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { AuditService } from '../audit/audit.service';
import { TenantContextStore } from '../tenant/tenant-context.store';
import { UpdateWebsiteConfigDto } from './dto/update-website-config.dto';
import { FirebaseStorageService } from './firebase-storage.service';
import { WebsiteService } from './website.service';

@Controller('website')
export class WebsiteController {
  constructor(
    private readonly website: WebsiteService,
    private readonly storage: FirebaseStorageService,
    private readonly audit: AuditService,
    private readonly tenantContext: TenantContextStore,
  ) {}

  @Get('site')
  async getSite() {
    return this.website.getCurrent();
  }

  @Put('site')
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  @RequirePermission('content.manage')
  async updateSite(@Body() dto: UpdateWebsiteConfigDto) {
    return this.website.updateCurrent(dto);
  }

  @Post('site/reset')
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  @RequirePermission('content.manage')
  async resetSite() {
    return this.website.resetCurrent();
  }

  @Post('media')
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  @RequirePermission('content.manage')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(@UploadedFile() file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  }) {
    const tenant = this.tenantContext.get();
    if (!tenant) throw new BadRequestException('Tenant context is required');
    if (!file) throw new BadRequestException('An image file is required');

    const uploaded = await this.storage.uploadTenantImage({
      tenantId: tenant.id,
      filename: file.originalname,
      contentType: file.mimetype,
      buffer: file.buffer,
    });

    await this.audit.record({
      action: 'WEBSITE_MEDIA_UPLOADED',
      entity: 'WebsiteMedia',
      entityId: uploaded.path,
      metadata: {
        contentType: uploaded.contentType,
        size: uploaded.size,
      },
    });

    return uploaded;
  }
}
