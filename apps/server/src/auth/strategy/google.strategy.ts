import { BadRequestException, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { User } from "@prisma/client";
import { ErrorMessage, processUsername } from "@reactive-resume/utils";
import { Profile, Strategy, StrategyOptions, VerifyCallback } from "passport-google-oauth20";

import { UserService } from "@/server/user/user.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(
    readonly clientID: string,
    readonly clientSecret: string,
    readonly callbackURL: string,
    private readonly userService: UserService,
  ) {
    super({ clientID, clientSecret, callbackURL, scope: ["email", "profile"] } as StrategyOptions);
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const { displayName, emails, photos, username } = profile;

    const email = emails?.[0].value ?? `${username}@google.com`;
    const picture = photos?.[0].value;

    let user: User | null = null;

    if (!email) throw new BadRequestException();

    try {
      const user =
        (await this.userService.findOneByIdentifier(email)) ??
        (username && (await this.userService.findOneByIdentifier(username)));

      if (!user) throw new Error("User not found.");

      done(null, user);
    } catch {
      try {
        user = await this.userService.create({
          email,
          picture,
          locale: "en-US",
          name: displayName,
          provider: "google",
          emailVerified: true, // auto-verify emails
          username: processUsername(username ?? email.split("@")[0]),
          secrets: { create: {} },
        });

        done(null, user ?? undefined);
      } catch {
        throw new BadRequestException(ErrorMessage.UserAlreadyExists);
      }
    }
  }
}
