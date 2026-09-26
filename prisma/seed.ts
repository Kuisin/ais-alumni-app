/**
 * Bootstrap data. Creates (or promotes) the first admin so someone can review
 * verification requests:
 *   SEED_ADMIN_EMAIL=you@example.com pnpm db:seed
 * With SEED_DEMO=1 it also creates a few ACTIVE demo members, an event and a
 * news post (local development only).
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    console.log("SEED_ADMIN_EMAIL not set; skipping admin bootstrap.");
  } else {
    const admin = await db.user.upsert({
      where: { primaryEmail: adminEmail },
      update: { isAdmin: true, state: "ACTIVE" },
      create: {
        primaryEmail: adminEmail,
        emailVerifiedAt: new Date(),
        state: "ACTIVE",
        isAdmin: true,
        lastNameRomaji: "Admin",
        firstNameRomaji: "AIS",
        nameRomaji: "AIS Admin",
        roles: { create: [{ role: "TEACHER", yearsFrom: 2010 }] },
      },
    });
    console.log(`Admin ready: ${admin.primaryEmail} (${admin.id})`);
  }

  if (process.env.SEED_DEMO !== "1") return;
  if (process.env.NODE_ENV === "production")
    throw new Error("Refusing to seed demo data in production");

  const demo: {
    email: string;
    first: string;
    last: string;
    kanji: [string, string] | null;
    year: number;
    stage: "WORKING" | "UNIVERSITY_COLLEGE";
  }[] = [
    {
      email: "hanako@example.com",
      first: "Hanako",
      last: "Suzuki",
      kanji: ["鈴木", "花子"],
      year: 2015,
      stage: "WORKING",
    },
    {
      email: "ken@example.com",
      first: "Ken",
      last: "Tanaka",
      kanji: ["田中", "健"],
      year: 2016,
      stage: "UNIVERSITY_COLLEGE",
    },
    {
      email: "emma@example.com",
      first: "Emma",
      last: "Brown",
      kanji: null,
      year: 2019,
      stage: "UNIVERSITY_COLLEGE",
    },
  ];
  for (const m of demo) {
    await db.user.upsert({
      where: { primaryEmail: m.email },
      update: {},
      create: {
        primaryEmail: m.email,
        emailVerifiedAt: new Date(),
        state: "ACTIVE",
        firstNameRomaji: m.first,
        lastNameRomaji: m.last,
        nameRomaji: `${m.first} ${m.last}`,
        lastNameKanji: m.kanji?.[0] ?? null,
        firstNameKanji: m.kanji?.[1] ?? null,
        nameKanji: m.kanji ? m.kanji.join(" ") : null,
        dateOfBirth: new Date(`${m.year - 18}-06-01`),
        bio: "Demo member",
        phone: "090-0000-0000",
        roles: {
          create: [
            {
              role: "FORMER_STUDENT",
              yearsFrom: m.year - 6,
              yearsTo: m.year,
              lastDivision: "HIGH_SCHOOL",
              graduationOrLeaveYear: m.year,
              didGraduate: true,
              currentStage: m.stage,
              currentStageUpdatedAt: new Date(),
              currentStageDetail: "Nagoya",
            },
          ],
        },
      },
    });
  }

  const creator = await db.user.findFirst({ where: { isAdmin: true } });
  if (creator && (await db.event.count()) === 0) {
    await db.event.create({
      data: {
        titleJa: "ホームカミング 2026",
        titleEn: "Homecoming 2026",
        bodyJa: "卒業生のみなさん、ぜひご参加ください。",
        bodyEn: "All alumni are welcome!",
        startsAt: new Date(Date.now() + 14 * 86400000),
        location: "AIS Gym",
        capacity: 100,
        createdById: creator.id,
      },
    });
    await db.newsPost.create({
      data: {
        titleJa: "同窓会アプリを公開しました",
        titleEn: "The alumni app is live",
        bodyJa: "**ようこそ！** プロフィールを更新してください。",
        bodyEn: "**Welcome!** Please complete your profile.",
        publishedAt: new Date(),
        notifiedAt: new Date(),
        pinned: true,
        createdById: creator.id,
      },
    });
  }
  console.log("Demo data ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
