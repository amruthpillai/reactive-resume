export interface User {
  id: string;
  name: string;
  picture: string | null;
  username: string;
  email: string;
  locale: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  provider: string;
}

export interface Resume {
  id: string;
  title: string;
  slug: string;
  data: Record<string, any>;
  visibility: string;
  locked: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Request {
      user?: User;
      payload?: {
        resume: Resume;
      };
    }
  }
}

export {};
