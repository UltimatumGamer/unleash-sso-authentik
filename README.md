# Unleash

## Preparation

> This tutorial assumes you use the Open Source version of Unleash.

The following placeholders will be used:

- `uneash.company` is the FQDN of Unleash.
- `authentik.company` is the FQDN of authentik.

### Step 1 - authentik

In authentik, under _Providers_, create an _OAuth2/OpenID Provider_ with these settings:

**Protocol Settings**

- Name: `Unleash`
- Client ID: `generated`
- Client Secret: `generated`
- Redirect URIs/Origins: `https://unleash.company/api/auth/callback`

Save the `Client ID` and `Client Secret` for later.

### Step 2 - Unleash

If you are using Docker Compose to run Unleash, you can replace the image in the `docker-compose.yml` file with the
following:

```yaml
services:
  web:
    image: ghcr.io/ultimatumgamer/unleash-sso-authentik:latest
    ports:
      - "4242:4242"
    environment:
      # This points Unleash to its backing database (defined in the `db` section below)
      DATABASE_URL: "postgres://postgres:unleash@db/db"
      # Disable SSL for database connections. @chriswk: why do we do this?
      DATABASE_SSL: "false"
      # Changing log levels:
      LOG_LEVEL: "warn"

      #     # Unleash Default User configuration
      UNLEASH_DEFAULT_ADMIN_USERNAME: "admin"
      UNLEASH_DEFAULT_ADMIN_PASSWORD: "password"

      # Unleash Proxy configuration
      # Proxy clients must use one of these keys to connect to the
      # Proxy. To add more keys, separate them with a comma (`key1,key2`).
      INIT_FRONTEND_API_TOKENS: "default:development.unleash-insecure-frontend-api-token"
      # Initialize Unleash with a default set of client API tokens. To
      # initialize Unleash with multiple tokens, separate them with a
      # comma (`token1,token2`).
      INIT_CLIENT_API_TOKENS: "default:development.unleash-insecure-api-token"

      # Authentik OpenID Connect configuration
      UNLEASH_HOST: "https://unleash.company"
      AUTH_HOST: "https://authentik.company"
      AUTH_SLUG: "unleash"
      AUTH_CLIENT_ID: "xxx"
      AUTH_CLIENT_SECRET: "xxx"
    depends_on:
      db:
        condition: service_healthy
    command: [ "node", "index.js" ]
    healthcheck:
      test: wget --no-verbose --tries=1 --spider http://localhost:4242/health || exit 1
      interval: 1s
      timeout: 1m
      retries: 5
      start_period: 15s
  db:
    image: postgres:15
    restart: unless-stopped
    ports:
      - "5432:5432"
    volumes:
      - ./data:/var/lib/postgresql/data
    environment:
      # create a database called `db`
      POSTGRES_DB: "db"
      # create a user called `postgres` with password `password`
      POSTGRES_USER: "postgres"
      POSTGRES_PASSWORD: "password"
      # trust incoming connections blindly (DON'T DO THIS IN PRODUCTION!)
      POSTGRES_HOST_AUTH_METHOD: "trust"
    healthcheck:
      test:
        [
          "CMD",
          "pg_isready",
          "--username=postgres",
          "--host=127.0.0.1",
          "--port=5432"
        ]
      interval: 2s
      timeout: 1m
      retries: 5
      start_period: 10s
```

In this configuration, the `AUTH_CLIENT_ID` and `AUTH_CLIENT_SECRET` are the values you saved from the authentik
configuration.
`UNLEASH_HOST` is the URL of the Unleash instance, and `AUTH_HOST` is the URL of the authentik instance.
`AUTH_SLUG` is the slug of the authentik application you created.

> Important: This configuration grants every user with permission in authentik access to Unleash. If you want to
> restrict access, you can use the `AUTH_HOST` and `AUTH_SLUG` to create a policy in authentik and bind it to the Unleash
> application.
> Every user created from this login will have the `ADMIN` role in Unleash.

### Step 3 - authentik

In authentik, create an application which uses this provider and directly launches Unleashs backend login-screen.
Optionally apply access restrictions to the application using policy bindings.

- Name: Unleash
- Slug: unleash
- Provider: Unleash
- Launch URL: https://unleash.company/api/admin/login

## Notes

- Inspired from: https://github.com/Unleash/unleash-docker-community/tree/main/platforms/openid-connect
- This configuration is not production-ready. Please refer to the official documentation for production-ready
  configurations.
- Auth Packages:
    - Core: https://www.passportjs.org/
    - Open ID Connect: https://www.passportjs.org/packages/passport-openidconnect/
