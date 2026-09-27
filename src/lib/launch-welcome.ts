import type { AudienceGroup, AudienceSpec } from "@/lib/news-audience";

/**
 * Launch announcement: the first ニュース post for each member type, a
 * welcome with a short how-to, signed with the sender's name. Created as
 * drafts by scripts/launch-welcome.ts; the sender publishes and notifies
 * them from 管理 → ニュース. Pure; unit-tested.
 */

export const LAUNCH_TYPES = [
  "TEACHERS",
  "CURRENT_STUDENTS",
  "FORMER_STUDENTS",
  "CURRENT_PARENTS",
  "FORMER_PARENTS",
] as const;
export type LaunchType = (typeof LAUNCH_TYPES)[number];

const GROUPS: Record<LaunchType, AudienceGroup[]> = {
  TEACHERS: ["TEACHER_CURRENT", "TEACHER_FORMER"],
  CURRENT_STUDENTS: ["CURRENT_STUDENT"],
  FORMER_STUDENTS: ["FORMER_STUDENT"],
  CURRENT_PARENTS: ["CURRENT_PARENT"],
  FORMER_PARENTS: ["FORMER_PARENT"],
};

/** Who receives the post for this member type. */
export function launchAudience(type: LaunchType): AudienceSpec {
  return {
    groups: GROUPS[type],
    cohortIds: [],
    includeParents: false,
    userIds: [],
  };
}

const TITLE: Record<LaunchType, { ja: string; en: string }> = {
  TEACHERS: {
    ja: "AIS同窓会アプリを公開しました（教職員の皆さまへ）",
    en: "The AIS Alumni app is live (for teachers & staff)",
  },
  CURRENT_STUDENTS: {
    ja: "AIS同窓会アプリを公開しました（在校生の皆さんへ）",
    en: "The AIS Alumni app is live (for current students)",
  },
  FORMER_STUDENTS: {
    ja: "AIS同窓会アプリを公開しました（卒業生・元在校生の皆さんへ）",
    en: "The AIS Alumni app is live (for graduates & former students)",
  },
  CURRENT_PARENTS: {
    ja: "AIS同窓会アプリを公開しました（在校生保護者の皆さまへ）",
    en: "The AIS Alumni app is live (for parents of current students)",
  },
  FORMER_PARENTS: {
    ja: "AIS同窓会アプリを公開しました（卒業生保護者の皆さまへ）",
    en: "The AIS Alumni app is live (for parents of graduates)",
  },
};

const INTRO: Record<LaunchType, { ja: string; en: string }> = {
  TEACHERS: {
    ja: "教職員の皆さま、AIS同窓会アプリへようこそ！本日、アプリを正式に公開しました。卒業生の近況を知ったり、同窓会イベントに参加したりできる場所です。",
    en: "Dear teachers and staff, welcome to the AIS Alumni app! It is now officially live. It is a place to hear how our graduates are doing and to join alumni events.",
  },
  CURRENT_STUDENTS: {
    ja: "在校生の皆さん、AIS同窓会アプリへようこそ！本日、アプリを正式に公開しました。卒業した先輩や先生とつながれる場所です。",
    en: "Hi students, welcome to the AIS Alumni app! It is now officially live. It is a place to connect with AIS graduates and teachers.",
  },
  FORMER_STUDENTS: {
    ja: "卒業生・元在校生の皆さん、AIS同窓会アプリへようこそ！本日、アプリを正式に公開しました。同級生や先生と再びつながり、同窓会の情報を受け取れる場所です。",
    en: "Hello graduates and former students, welcome to the AIS Alumni app! It is now officially live. It is a place to reconnect with classmates and teachers and to hear about alumni events.",
  },
  CURRENT_PARENTS: {
    ja: "在校生の保護者の皆さま、AIS同窓会アプリへようこそ！本日、アプリを正式に公開しました。AISのコミュニティとつながり、委員会からのニュースやイベントの情報を受け取れる場所です。",
    en: "Dear parents of current students, welcome to the AIS Alumni app! It is now officially live. It is a place to stay connected with the AIS community and get news and events from the committee.",
  },
  FORMER_PARENTS: {
    ja: "卒業生の保護者の皆さま、AIS同窓会アプリへようこそ！本日、アプリを正式に公開しました。AISでつながった皆さまと、これからもつながり続けられる場所です。",
    en: "Dear parents of graduates, welcome to the AIS Alumni app! It is now officially live. It is a place to keep in touch with the people you met through AIS.",
  },
};

type Step = { ja: string; en: string };

const PROFILE: Step = {
  ja: "**マイページ**：写真と自己紹介を設定しましょう。項目ごとに公開する相手を選べます。",
  en: "**Me**: add a photo and a short bio. You choose who can see each item.",
};
const HISTORY: Step = {
  ja: "**マイページ →「学歴・職歴」**：AISの後の学校や勤め先を追加すると、同じ学校・会社の人とつながれます。",
  en: "**Me → Education & work**: add your schools and workplaces after AIS to find people from the same ones.",
};
const DIRECTORY: Step = {
  ja: "**名簿**：知っている人を探してフォローしましょう。連絡先は、あなたが承認した相手にだけ公開されます。",
  en: "**Directory**: find people you know and follow them. Your contact details are shown only to people you approve.",
};
const NEWS_EVENTS: Step = {
  ja: "**ニュース・イベント**：委員会からのお知らせはこの「ニュース」に届きます。イベントの出欠はワンタップで登録できます。",
  en: "**News & Events**: news from the committee arrives here in News. RSVP to events with one tap.",
};
const CHAT: Step = {
  ja: "**チャット**：立場ごと・学年ごとのグループチャットに自動で参加しています。",
  en: "**Chat**: you are already in group chats for your member type and class year.",
};
const PARENT_CHAT: Step = {
  ja: "**チャット**：保護者のグループチャットや、お子さまの学年の保護者グループに自動で参加しています。",
  en: "**Chat**: you are already in the parents' group chat and the one for your child's class year.",
};
const TEACHER_CHAT: Step = {
  ja: "**チャット**：教職員のグループチャットで、教職員どうし連絡を取り合えます。",
  en: "**Chat**: keep in touch with other teachers and staff in the teachers' group chat.",
};
const FAMILY: Step = {
  ja: "**家族**：お子さまやご家族のアカウントとつなげると、家族のページで互いを確認できます。",
  en: "**Family**: link your children's and family members' accounts to see each other on the Family page.",
};
const STUDENT_FAMILY: Step = {
  ja: "**家族**：保護者のアカウントとつなげられます。",
  en: "**Family**: you can link your account with your parents'.",
};
const INVITE: Step = {
  ja: "**同窓生を招待**：まだ登録していない同級生や先生に招待リンクを送れます。",
  en: "**Invite alumni**: send an invite link to classmates and teachers who haven't joined yet.",
};
const LINE: Step = {
  ja: "**設定 →「LINE」**：LINEを連携すると、ニュースやイベントのお知らせがLINEで届きます（未連携の方にはメールで届きます）。",
  en: "**Settings → LINE**: link LINE to get news and event reminders there (otherwise they come by email).",
};

const STEPS: Record<LaunchType, Step[]> = {
  TEACHERS: [PROFILE, DIRECTORY, NEWS_EVENTS, TEACHER_CHAT, INVITE, LINE],
  CURRENT_STUDENTS: [
    PROFILE,
    DIRECTORY,
    NEWS_EVENTS,
    CHAT,
    STUDENT_FAMILY,
    LINE,
  ],
  FORMER_STUDENTS: [
    PROFILE,
    HISTORY,
    DIRECTORY,
    NEWS_EVENTS,
    CHAT,
    INVITE,
    LINE,
  ],
  CURRENT_PARENTS: [PROFILE, FAMILY, DIRECTORY, NEWS_EVENTS, PARENT_CHAT, LINE],
  FORMER_PARENTS: [PROFILE, FAMILY, DIRECTORY, NEWS_EVENTS, PARENT_CHAT, LINE],
};

export type LaunchPost = {
  titleJa: string;
  titleEn: string;
  bodyJa: string;
  bodyEn: string;
};

/** The launch post for one member type (Markdown), signed by the sender. */
export function launchPost(
  type: LaunchType,
  sender: { nameKanji: string | null; nameRomaji: string | null },
): LaunchPost {
  const ja = sender.nameKanji ?? sender.nameRomaji;
  const en = sender.nameRomaji ?? sender.nameKanji;
  const steps = STEPS[type];
  const body = (
    l: "ja" | "en",
    heading: string,
    outro: string,
    name: string | null,
  ) =>
    [
      INTRO[type][l],
      `## ${heading}`,
      steps.map((s, i) => `${i + 1}. ${s[l]}`).join("\n"),
      outro,
      name ? `— ${name}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  return {
    titleJa: TITLE[type].ja,
    titleEn: TITLE[type].en,
    bodyJa: body(
      "ja",
      "かんたんな使い方",
      "分からないことは、メニューの「お問い合わせ」からいつでもどうぞ。これからよろしくお願いします！",
      ja,
    ),
    bodyEn: body(
      "en",
      "Getting started",
      "Questions? Use “Contact & support” in the menu any time. We're glad to have you here!",
      en,
    ),
  };
}
