import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { createId } from "@paralleldrive/cuid2";
import { ErrorMessage, processUsername } from "@reactive-resume/utils";
import { Profile, Strategy, StrategyOptions } from "passport-github2";

import { User } from "../../types/express";
import { UserService } from "../../user/user.service";

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, "github") {
  constructor(
    readonly clientID: string,
    readonly clientSecret: string,
    readonly callbackURL: string,
    private readonly userService: UserService,
  ) {
    super({ clientID, clientSecret, callbackURL, scope: ["user:email"] } as StrategyOptions);
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err?: string | Error | null, user?: Express.User, info?: unknown) => void,
  ) {
    const { displayName, emails, photos, username } = profile;

    const email = (emails?.[0].value ?? `${username}@github.com`).toLocaleLowerCase();
    const picture = photos?.[0].value;

    let user: User | null = null;

    if (!email) throw new BadRequestException(ErrorMessage.InvalidCredentials);

    try {
      user =
        (await this.userService.findOneByIdentifier(email)) ??
        (username ? await this.userService.findOneByIdentifier(username) : null);

      if (!user) throw new BadRequestException(ErrorMessage.InvalidCredentials);

      done(null, user);
    } catch {
      try {
        user = await this.userService.create({
          email,
          picture,
          locale: "en-US",
          provider: "github",
          name: displayName || createId(),
          emailVerified: true, // auto-verify emails
          username: processUsername(username ?? email.split("@")[0]),
          secrets: { create: {} },
        });

        done(null, user);
      } catch (error) {
        Logger.error(error);

        throw new BadRequestException(ErrorMessage.UserAlreadyExists);
      }
    }
  }
}
