import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { CreateResumeDto, ImportResumeDto, ResumeDto, UpdateResumeDto } from "@reactive-resume/dto";
import { defaultResumeData, ResumeData } from "@reactive-resume/schema";
import type { DeepPartial } from "@reactive-resume/utils";
import { ErrorMessage, generateRandomName } from "@reactive-resume/utils";
import slugify from "@sindresorhus/slugify";
import deepmerge from "deepmerge";

import { DatabaseService } from "../database/database.service";
import { PrinterService } from "../printer/printer.service";
import { StorageService } from "../storage/storage.service";
import { Resume } from "../types/express";

@Injectable()
export class ResumeService {
  constructor(
    private readonly database: DatabaseService,
    private readonly printerService: PrinterService,
    private readonly storageService: StorageService,
  ) {}

  async create(userId: string, createResumeDto: CreateResumeDto) {
    const db = this.database.getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists || !userDoc.data()) {
      throw new NotFoundException("User not found");
    }

    const userData = userDoc.data()!;
    const { name, email, picture } = userData;

    const data = deepmerge(defaultResumeData, {
      basics: { name, email, picture: { url: picture ?? "" } },
    } satisfies DeepPartial<ResumeData>);

    const resumeId = db.collection("resumes").doc().id;
    const resumeData = {
      userId,
      title: createResumeDto.title,
      slug: createResumeDto.slug ?? slugify(createResumeDto.title),
      visibility: createResumeDto.visibility,
      data,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("resumes").doc(resumeId).set(resumeData);

    return {
      id: resumeId,
      ...resumeData,
    };
  }

  async import(userId: string, importResumeDto: ImportResumeDto) {
    const db = this.database.getFirestore();
    const randomTitle = generateRandomName();

    const resumeId = db.collection("resumes").doc().id;
    const resumeData = {
      userId,
      visibility: "private",
      data: importResumeDto.data,
      title: importResumeDto.title ?? randomTitle,
      slug: importResumeDto.slug ?? slugify(randomTitle),
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("resumes").doc(resumeId).set(resumeData);

    return {
      id: resumeId,
      ...resumeData,
    };
  }

  async findAll(userId: string) {
    const db = this.database.getFirestore();
    const snapshot = await db
      .collection("resumes")
      .where("userId", "==", userId)
      .orderBy("updatedAt", "desc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async findOne(id: string, userId?: string) {
    const db = this.database.getFirestore();
    const resumeDoc = await db.collection("resumes").doc(id).get();

    if (!resumeDoc.exists || !resumeDoc.data()) {
      throw new NotFoundException("Resume not found");
    }

    const resumeData = resumeDoc.data()!;

    if (userId && resumeData.userId !== userId) {
      throw new NotFoundException("Resume not found");
    }

    return {
      id: resumeDoc.id,
      ...resumeData,
    } as Resume;
  }

  async findOneStatistics(id: string) {
    const db = this.database.getFirestore();
    const statsSnapshot = await db
      .collection("statistics")
      .where("resumeId", "==", id)
      .limit(1)
      .get();

    if (statsSnapshot.empty) {
      return {
        views: 0,
        downloads: 0,
      };
    }

    const stats = statsSnapshot.docs[0].data();
    return {
      views: stats.views ?? 0,
      downloads: stats.downloads ?? 0,
    };
  }

  async findOneByUsernameSlug(username: string, slug: string, userId?: string): Promise<Resume> {
    const db = this.database.getFirestore();

    const userSnapshot = await db
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      throw new NotFoundException("User not found");
    }

    const user = userSnapshot.docs[0];
    const resumeSnapshot = await db
      .collection("resumes")
      .where("userId", "==", user.id)
      .where("slug", "==", slug)
      .where("visibility", "==", "public")
      .limit(1)
      .get();

    if (resumeSnapshot.empty) {
      throw new NotFoundException("Resume not found");
    }

    const resumeDoc = resumeSnapshot.docs[0];
    const resume = {
      id: resumeDoc.id,
      ...resumeDoc.data(),
    } as Resume;

    if (!userId) {
      const statsSnapshot = await db
        .collection("statistics")
        .where("resumeId", "==", resume.id)
        .limit(1)
        .get();

      if (statsSnapshot.empty) {
        await db.collection("statistics").add({
          resumeId: resume.id,
          views: 1,
          downloads: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        const statsDoc = statsSnapshot.docs[0];
        const currentViews = statsDoc.data().views || 0;
        await statsDoc.ref.update({
          views: currentViews + 1,
          updatedAt: new Date(),
        });
      }
    }

    return resume;
  }

  async update(userId: string, id: string, updateResumeDto: UpdateResumeDto) {
    try {
      const db = this.database.getFirestore();
      const resumeDoc = await db.collection("resumes").doc(id).get();

      if (!resumeDoc.exists || !resumeDoc.data()) {
        throw new NotFoundException("Resume not found");
      }

      const resumeData = resumeDoc.data()!;

      if (resumeData.userId !== userId) {
        throw new NotFoundException("Resume not found");
      }

      if (resumeData.locked) {
        throw new BadRequestException(ErrorMessage.ResumeLocked);
      }

      const updateData = {
        title: updateResumeDto.title,
        slug: updateResumeDto.slug,
        visibility: updateResumeDto.visibility,
        data: updateResumeDto.data,
        updatedAt: new Date(),
      };

      await resumeDoc.ref.update(updateData);

      const updatedDoc = await resumeDoc.ref.get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      };
    } catch (error) {
      Logger.error(error);
      throw new InternalServerErrorException(error);
    }
  }

  async lock(userId: string, id: string, set: boolean) {
    const db = this.database.getFirestore();
    const resumeDoc = await db.collection("resumes").doc(id).get();

    if (!resumeDoc.exists || !resumeDoc.data()) {
      throw new NotFoundException("Resume not found");
    }

    const resumeData = resumeDoc.data()!;

    if (resumeData.userId !== userId) {
      throw new NotFoundException("Resume not found");
    }

    await resumeDoc.ref.update({
      locked: set,
      updatedAt: new Date(),
    });

    const updatedDoc = await resumeDoc.ref.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };
  }

  async remove(userId: string, id: string) {
    const db = this.database.getFirestore();

    await Promise.all([
      this.storageService.deleteObject(userId, "resumes", id),
      this.storageService.deleteObject(userId, "previews", id),
    ]);

    const resumeDoc = await db.collection("resumes").doc(id).get();

    if (!resumeDoc.exists || !resumeDoc.data()) {
      throw new NotFoundException("Resume not found");
    }

    const resumeData = resumeDoc.data()!;

    if (resumeData.userId !== userId) {
      throw new NotFoundException("Resume not found");
    }

    await resumeDoc.ref.delete();

    return {
      id: resumeDoc.id,
      ...resumeData,
    };
  }

  async printResume(resume: ResumeDto, userId?: string) {
    const url = await this.printerService.printResume(resume);

    if (!userId) {
      const db = this.database.getFirestore();
      const statsSnapshot = await db
        .collection("statistics")
        .where("resumeId", "==", resume.id)
        .limit(1)
        .get();

      if (statsSnapshot.empty) {
        await db.collection("statistics").add({
          resumeId: resume.id,
          views: 0,
          downloads: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        const statsDoc = statsSnapshot.docs[0];
        const currentDownloads = statsDoc.data().downloads || 0;
        await statsDoc.ref.update({
          downloads: currentDownloads + 1,
          updatedAt: new Date(),
        });
      }
    }

    return url;
  }

  printPreview(resume: ResumeDto) {
    return this.printerService.printPreview(resume);
  }
}
