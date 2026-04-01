import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ErrorMessage, generateRandomName, processUsername } from "@reactive-resume/utils";
import { Profile, Strategy, StrategyOptions } from "passport-openidconnect";

import { User } from "../../types/express";
import { UserService } from "../../user/user.service";

@Injectable()
export class OpenIDStrategy extends PassportStrategy(Strategy, "openid") {
  constructor(
    readonly authorizationURL: string,
    readonly callbackURL: string,
    readonly clientID: string,
    readonly clientSecret: string,
    readonly issuer: string,
    readonly scope: string,
    readonly tokenURL: string,
    readonly userInfoURL: string,
    private readonly userService: UserService,
  ) {
    super({
      authorizationURL,
      callbackURL,
      clientID,
      clientSecret,
      issuer,
      scope,
      tokenURL,
      userInfoURL,
    } as StrategyOptions);
  }

  async validate(
    _issuer: unknown,
    profile: Profile,
    done: (err?: string | Error | null, user?: Express.User, info?: unknown) => void,
  ) {
    const { displayName, emails, photos, username } = profile;

    const uniqueId = generateRandomName({ length: 2, style: "lowerCase", separator: "-" });
    const email = (emails?.[0].value ?? `${username ?? uniqueId}@openid.com`).toLocaleLowerCase();
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
          provider: "openid",
          name: displayName || uniqueId,
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
