# creation

npx sv create sveltekit

typescript
vitest and sveltekit-adapter

node adapter

package manager
npm

# RETURN Server
/docker/return/deploy-github.sh  ed-tech-at/aicast-fyi main

# Database

```
npm install prisma --save-dev
npm install @prisma/client

npx prisma init
```

## User Creation
```
-- Create user
CREATE USER prompting_schule_main WITH PASSWORD 'PASSWORT_NOGIT';

-- Create database with user as owner
CREATE DATABASE prompting_schule_main OWNER prompting_schule_main;

-- Set privileges
GRANT ALL PRIVILEGES ON DATABASE prompting_schule_main TO prompting_schule_main;
```

and local database for migrations

```
-- Create database with user as owner
CREATE DATABASE prompting_schule_migrations OWNER prompting_schule_main;

-- Set privileges
GRANT ALL PRIVILEGES ON DATABASE prompting_schule_migrations TO prompting_schule_main;
```

## .env 

DATABASE_URL="postgresql://prompting_schule_main:PASSWORT_NOGIT@localhost:5432/prompting_schule_main"
SHADOW_DATABASE_URL="postgresql://prompting_schule_main:PASSWORT_NOGIT@localhost:5432/prompting_schule_migrations"

## prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}

## Submit database changes
```
npx prisma migrate dev --name init
npx prisma generate
```

und danach wenn alles geht:
```
npx prisma migrate status
npx prisma migrate deploy
```


## DB Sequence Reset:
SELECT * FROM "QuizQuestion_id_seq";

ALTER SEQUENCE "QuizQuestion_id_seq" RESTART WITH 40;

SELECT * FROM "Course_id_seq";

ALTER SEQUENCE "Course_id_seq" RESTART WITH 10;

SELECT * FROM "Element_id_seq";

ALTER SEQUENCE "Element_id_seq" RESTART WITH 55;

SELECT * FROM "Lesson_id_seq";

ALTER SEQUENCE "Lesson_id_seq" RESTART WITH 22;


## DB Update

docker-compose pull
docker-compose up -d

## mac pgdump
brew install libpq
/opt/homebrew/opt/libpq/bin/pg_dump


# Open Badge
https://openbadgesvalidator.imsglobal.org/
https://openbadgefactory.com/validator/
https://badgecheck.io/