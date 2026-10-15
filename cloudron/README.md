# Cloudron package

Installs Reactive Resume on [Cloudron](https://cloudron.io) as a community app. It runs the official image unchanged: on Cloudron (`CLOUDRON=1`), the app reads the PostgreSQL, Redis, email and OpenID Connect addon variables itself, and the image entrypoint generates `AUTH_SECRET` and `ENCRYPTION_SECRET` once in `/app/data`.

Once a version is published (see below), install it from the Cloudron dashboard under **App Store → Community apps** with this URL:

```
https://github.com/reactive-resume/reactive-resume/blob/main/cloudron/CloudronVersions.json
```

## Publish a new version

After a release image is on GHCR:

1. Set `version` in [`CloudronManifest.json`](CloudronManifest.json) to the release and add a `[version]` section to [`CHANGELOG`](CHANGELOG).
2. Record the release image, then commit `CloudronVersions.json`:

   ```sh
   cd cloudron
   npx cloudron versions add --image ghcr.io/reactive-resume/reactive-resume:v<version>
   npx cloudron versions verify
   ```

See Cloudron's [publishing guide](https://docs.cloudron.io/packaging/publishing/) for revoking a broken version.
