import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectArtifact } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectArtifactDto } from './dto/create-project-artifact.dto';
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

  async findAll() {
    const artifacts = await this.prisma.projectArtifact.findMany({
      include: artifactInclude,
      orderBy: [{ createdAt: 'desc' }],
    });

    return { data: artifacts.map((artifact) => this.toResponse(artifact)) };
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
}

