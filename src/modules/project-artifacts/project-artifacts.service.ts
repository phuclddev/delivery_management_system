import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectArtifact } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectArtifactDto } from './dto/create-project-artifact.dto';
import { ProjectArtifactQueryDto } from './dto/project-artifact-query.dto';
import { UpdateProjectArtifactDto } from './dto/update-project-artifact.dto';

const artifactInclude = {
  project: {
    select: {
      id: true,
      projectCode: true,
      name: true,
      status: true,
    },
  },
  uploader: {
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  },
} satisfies Prisma.ProjectArtifactInclude;

type ArtifactDetail = Prisma.ProjectArtifactGetPayload<{
  include: typeof artifactInclude;
}>;

const sortableArtifactFields = new Set([
  'createdAt',
  'updatedAt',
  'title',
  'artifactType',
]);

@Injectable()
export class ProjectArtifactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateProjectArtifactDto) {
    this.validateContentPayload(payload.contentText, payload.fileUrl);
    await this.ensureRelations(payload.projectId, payload.uploadedBy);

    const artifact = await this.prisma.projectArtifact.create({
      data: this.toCreateData(payload),
      include: artifactInclude,
    });

    return { data: this.toResponse(artifact) };
  }

  async findAll(query: ProjectArtifactQueryDto) {
    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = this.clampPageSize(this.parsePositiveInt(query.pageSize, 20));
    const sortBy = this.resolveSortBy(query.sortBy);
    const sortOrder = this.resolveSortOrder(query.sortOrder);

    const where: Prisma.ProjectArtifactWhereInput = {
      projectId: this.toOptionalString(query.projectId),
      uploadedBy: this.toOptionalString(query.uploadedBy),
      artifactType: this.toOptionalString(query.artifactType),
      ...(this.toOptionalBoolean(query.isFinal) === undefined
        ? {}
        : { isFinal: this.toOptionalBoolean(query.isFinal) }),
    };

    const [artifacts, total] = await this.prisma.$transaction([
      this.prisma.projectArtifact.findMany({
        where,
        include: artifactInclude,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.projectArtifact.count({ where }),
    ]);

    return {
      data: artifacts.map((artifact) => this.toResponse(artifact)),
      meta: {
        page,
        pageSize,
        total,
        sortBy,
        sortOrder,
      },
    };
  }

  async findOne(id: string) {
    const artifact = await this.prisma.projectArtifact.findUnique({
      where: { id },
      include: artifactInclude,
    });

    if (!artifact) {
      throw new NotFoundException(`Artifact ${id} was not found.`);
    }

    return { data: this.toResponse(artifact) };
  }

  async update(id: string, payload: UpdateProjectArtifactDto) {
    const existing = await this.ensureArtifactExists(id);
    this.validateContentPayload(
      payload.contentText ?? existing.contentText ?? undefined,
      payload.fileUrl ?? existing.fileUrl ?? undefined,
    );
    await this.ensureRelations(payload.projectId, payload.uploadedBy);

    const artifact = await this.prisma.projectArtifact.update({
      where: { id },
      data: this.toUpdateData(payload),
      include: artifactInclude,
    });

    return { data: this.toResponse(artifact) };
  }

  async remove(id: string) {
    await this.ensureArtifactExists(id);
    await this.prisma.projectArtifact.delete({ where: { id } });

    return {
      data: {
        id,
        deleted: true,
      },
    };
  }

  private validateContentPayload(contentText?: string, fileUrl?: string) {
    if (!contentText && !fileUrl) {
      throw new BadRequestException('Either contentText or fileUrl is required.');
    }
  }

  private async ensureArtifactExists(id: string): Promise<ProjectArtifact> {
    const artifact = await this.prisma.projectArtifact.findUnique({ where: { id } });

    if (!artifact) {
      throw new NotFoundException(`Artifact ${id} was not found.`);
    }

    return artifact;
  }

  private async ensureRelations(projectId?: string, uploadedBy?: string) {
    if (projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        throw new NotFoundException(`Project ${projectId} was not found.`);
      }
    }

    if (uploadedBy) {
      const user = await this.prisma.user.findUnique({ where: { id: uploadedBy } });
      if (!user) {
        throw new NotFoundException(`User ${uploadedBy} was not found.`);
      }
    }
  }

  private toCreateData(
    payload: CreateProjectArtifactDto,
  ): Prisma.ProjectArtifactUncheckedCreateInput {
    return {
      projectId: payload.projectId,
      artifactType: payload.artifactType,
      title: payload.title,
      contentText: payload.contentText,
      fileUrl: payload.fileUrl,
      mimeType: payload.mimeType,
      uploadedBy: payload.uploadedBy,
      isFinal: payload.isFinal ?? false,
    };
  }

  private toUpdateData(
    payload: UpdateProjectArtifactDto,
  ): Prisma.ProjectArtifactUncheckedUpdateInput {
    return {
      projectId: payload.projectId,
      artifactType: payload.artifactType,
      title: payload.title,
      contentText: payload.contentText,
      fileUrl: payload.fileUrl,
      mimeType: payload.mimeType,
      uploadedBy: payload.uploadedBy,
      isFinal: payload.isFinal,
    };
  }

  private toResponse(artifact: ArtifactDetail) {
    return {
      id: artifact.id,
      project: artifact.project,
      artifactType: artifact.artifactType,
      title: artifact.title,
      contentText: artifact.contentText,
      fileUrl: artifact.fileUrl,
      mimeType: artifact.mimeType,
      uploader: artifact.uploader,
      isFinal: artifact.isFinal,
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt,
    };
  }

  private toOptionalString(value?: string): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private toOptionalBoolean(value?: string): boolean | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }

    return undefined;
  }

  private parsePositiveInt(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private clampPageSize(value: number): number {
    return Math.min(Math.max(value, 1), 100);
  }

  private resolveSortBy(value?: string): keyof Prisma.ProjectArtifactOrderByWithRelationInput {
    if (value && sortableArtifactFields.has(value)) {
      return value as keyof Prisma.ProjectArtifactOrderByWithRelationInput;
    }

    return 'createdAt';
  }

  private resolveSortOrder(value?: string): Prisma.SortOrder {
    return value?.toLowerCase() === 'asc' ? 'asc' : 'desc';
  }
}
