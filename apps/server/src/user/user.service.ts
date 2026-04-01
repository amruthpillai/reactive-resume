import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { UserWithSecrets } from "@reactive-resume/dto";
import { ErrorMessage } from "@reactive-resume/utils";

import { DatabaseService } from "../database/database.service";
import { StorageService } from "../storage/storage.service";
import { User } from "../types/express";

interface CreateUserData {
  name: string;
  email: string;
  username: string;
  provider: string;
  emailVerified: boolean;
  locale?: string;
  picture?: string | null;
  secrets?: {
    create: {
      password?: string;
      lastSignedIn?: Date;
      verificationToken?: string;
      twoFactorSecret?: string;
      twoFactorEnabled?: boolean;
      refreshToken?: string;
      resetToken?: string;
    };
  };
}

interface UpdateUserData {
  name?: string;
  email?: string;
  username?: string;
  picture?: string | null;
  locale?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
}

interface UpdateSecretsData {
  password?: string | null;
  lastSignedIn?: Date;
  verificationToken?: string | null;
  twoFactorSecret?: string | null;
  twoFactorEnabled?: boolean;
  twoFactorBackupCodes?: string[];
  refreshToken?: string | null;
  resetToken?: string | null;
}

@Injectable()
export class UserService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async findOneById(id: string): Promise<UserWithSecrets> {
    const db = this.database.getFirestore();
    const userDoc = await db.collection("users").doc(id).get();

    if (!userDoc.exists) {
      throw new NotFoundException("User not found");
    }

    const userData = { id: userDoc.id, ...userDoc.data() } as User;

    const secretsSnapshot = await db
      .collection("secrets")
      .where("userId", "==", id)
      .limit(1)
      .get();

    if (secretsSnapshot.empty) {
      throw new InternalServerErrorException(ErrorMessage.SecretsNotFound);
    }

    const secretsDoc = secretsSnapshot.docs[0];
    const secrets = {
      id: secretsDoc.id,
      userId: id,
      ...secretsDoc.data(),
    };

    return { ...userData, secrets } as UserWithSecrets;
  }

  async findOneByIdentifier(identifier: string): Promise<UserWithSecrets | null> {
    const db = this.database.getFirestore();

    let userDoc = await db.collection("users").where("email", "==", identifier).limit(1).get();

    if (userDoc.empty) {
      userDoc = await db.collection("users").where("username", "==", identifier).limit(1).get();
    }

    if (userDoc.empty) {
      return null;
    }

    const user = { id: userDoc.docs[0].id, ...userDoc.docs[0].data() } as User;

    const secretsSnapshot = await db
      .collection("secrets")
      .where("userId", "==", user.id)
      .limit(1)
      .get();

    if (secretsSnapshot.empty) {
      return null;
    }

    const secrets = {
      id: secretsSnapshot.docs[0].id,
      userId: user.id,
      ...secretsSnapshot.docs[0].data(),
    };

    return { ...user, secrets } as UserWithSecrets;
  }

  async findOneByIdentifierOrThrow(identifier: string): Promise<UserWithSecrets> {
    const user = await this.findOneByIdentifier(identifier);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async create(data: CreateUserData): Promise<UserWithSecrets> {
    const db = this.database.getFirestore();

    const userId = db.collection("users").doc().id;

    const userData = {
      name: data.name,
      email: data.email,
      username: data.username,
      provider: data.provider,
      emailVerified: data.emailVerified,
      locale: data.locale || "en-US",
      picture: data.picture || null,
      twoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("users").doc(userId).set(userData);

    const secretsData = {
      userId,
      password: data.secrets?.create?.password || null,
      lastSignedIn: data.secrets?.create?.lastSignedIn || new Date(),
      verificationToken: data.secrets?.create?.verificationToken || null,
      twoFactorSecret: data.secrets?.create?.twoFactorSecret || null,
      twoFactorEnabled: data.secrets?.create?.twoFactorEnabled || false,
      refreshToken: data.secrets?.create?.refreshToken || null,
      resetToken: data.secrets?.create?.resetToken || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const secretsRef = await db.collection("secrets").add(secretsData);

    const secrets = {
      id: secretsRef.id,
      ...secretsData,
    };

    return {
      id: userId,
      ...userData,
      secrets,
    } as unknown as UserWithSecrets;
  }

  async updateByEmail(email: string, data: UpdateUserData): Promise<User> {
    const db = this.database.getFirestore();

    const userSnapshot = await db.collection("users").where("email", "==", email).limit(1).get();

    if (userSnapshot.empty) {
      throw new NotFoundException("User not found");
    }

    const userDoc = userSnapshot.docs[0];
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await userDoc.ref.update(updateData);

    const updatedDoc = await userDoc.ref.get();
    return { id: updatedDoc.id, ...updatedDoc.data() } as User;
  }

  async updateSecretsByEmail(email: string, data: UpdateSecretsData): Promise<void> {
    const db = this.database.getFirestore();

    const userSnapshot = await db.collection("users").where("email", "==", email).limit(1).get();

    if (userSnapshot.empty) {
      throw new NotFoundException("User not found");
    }

    const userId = userSnapshot.docs[0].id;

    const secretsSnapshot = await db
      .collection("secrets")
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (secretsSnapshot.empty) {
      throw new NotFoundException("Secrets not found");
    }

    const secretsDoc = secretsSnapshot.docs[0];
    await secretsDoc.ref.update({
      ...data,
      updatedAt: new Date(),
    });
  }

  async updateByResetToken(resetToken: string, data: UpdateSecretsData): Promise<void> {
    const db = this.database.getFirestore();

    const secretsSnapshot = await db
      .collection("secrets")
      .where("resetToken", "==", resetToken)
      .limit(1)
      .get();

    if (secretsSnapshot.empty) {
      throw new NotFoundException("Reset token not found");
    }

    const secretsDoc = secretsSnapshot.docs[0];
    await secretsDoc.ref.update({
      ...data,
      updatedAt: new Date(),
    });
  }

  async deleteOneById(id: string): Promise<void> {
    const db = this.database.getFirestore();

    const secretsSnapshot = await db.collection("secrets").where("userId", "==", id).get();

    const deletePromises = [
      this.storageService.deleteFolder(id),
      db.collection("users").doc(id).delete(),
      ...secretsSnapshot.docs.map((doc) => doc.ref.delete()),
    ];

    await Promise.all(deletePromises);
  }
}
