import { ChatGroupKind } from "@/generated/prisma/enums";
import { MAX_CHAT_MESSAGE } from "@/lib/chat";

/**
 * Launch announcement: the first message in each member-type group chat,
 * posted under the sender's own account (scripts/launch-welcome.ts). One
 * message per group in Japanese, then English, with a short how-to. Pure;
 * unit-tested.
 */

export const LAUNCH_KINDS = [
  ChatGroupKind.TEACHERS,
  ChatGroupKind.CURRENT_STUDENTS,
  ChatGroupKind.FORMER_STUDENTS,
  ChatGroupKind.CURRENT_PARENTS,
  ChatGroupKind.FORMER_PARENTS,
] as const;
export type LaunchKind = (typeof LAUNCH_KINDS)[number];

/** Marks the message so the script can tell it has already been posted. */
export const LAUNCH_TITLE_JA = "🎉 AIS同窓会アプリへようこそ！";

const INTRO: Record<LaunchKind, { ja: string; en: string }> = {
  TEACHERS: {
    ja: "教職員の皆さま、本日AIS同窓会アプリを公開しました。卒業生の近況を知ったり、同窓会イベントに参加したりできる場所です。ここは教職員だけのグループチャットです。",
    en: "Dear teachers and staff, the AIS Alumni app is now live. It is a place to hear how our graduates are doing and to join alumni events. This group chat is for teachers and staff only.",
  },
  CURRENT_STUDENTS: {
    ja: "在校生の皆さん、本日AIS同窓会アプリを公開しました。卒業した先輩や先生とつながれる場所です。ここは在校生のグループチャットです。",
    en: "Hi students! The AIS Alumni app is now live. It is a place to connect with AIS graduates and teachers. This group chat is for current students.",
  },
  FORMER_STUDENTS: {
    ja: "卒業生・元在校生の皆さん、本日AIS同窓会アプリを公開しました。同級生や先生と再びつながり、同窓会の情報を受け取れる場所です。ここは卒業生と元在校生のグループチャットです。",
    en: "Hello graduates and former students! The AIS Alumni app is now live. It is a place to reconnect with classmates and teachers and to hear about alumni events. This group chat is for graduates and former students.",
  },
  CURRENT_PARENTS: {
    ja: "在校生の保護者の皆さま、本日AIS同窓会アプリを公開しました。AISのコミュニティとつながり、委員会からのニュースやイベントの情報を受け取れる場所です。ここは在校生保護者のグループチャットです。",
    en: "Dear parents of current students, the AIS Alumni app is now live. It is a place to stay connected with the AIS community and get news and events from the committee. This group chat is for parents of current students.",
  },
  FORMER_PARENTS: {
    ja: "卒業生の保護者の皆さま、本日AIS同窓会アプリを公開しました。AISでつながった皆さまと、これからもつながり続けられる場所です。ここは卒業生保護者のグループチャットです。",
    en: "Dear parents of graduates, the AIS Alumni app is now live. It is a place to keep in touch with the people you met through AIS. This group chat is for parents of graduates.",
  },
};

type Step = { ja: string; en: string };

const PROFILE: Step = {
  ja: "マイページ：写真と自己紹介を設定しましょう。項目ごとに公開する相手を選べます。",
  en: "Me: add a photo and a short bio. You choose who can see each item.",
};
const HISTORY: Step = {
  ja: "マイページ →「学歴・職歴」：AISの後の学校や勤め先を追加すると、同じ学校・会社の人とつながれます。",
  en: "Me → Education & work: add your schools and workplaces after AIS to find people from the same ones.",
};
const DIRECTORY: Step = {
  ja: "名簿：知っている人を探してフォローしましょう。連絡先は、あなたが承認した相手にだけ公開されます。",
  en: "Directory: find people you know and follow them. Your contact details are shown only to people you approve.",
};
const NEWS_EVENTS: Step = {
  ja: "ニュース・イベント：委員会からのニュースを読み、イベントの出欠をワンタップで登録できます。",
  en: "News & Events: read news from the committee and RSVP to events with one tap.",
};
const CHAT: Step = {
  ja: "チャット：このグループのほか、学年ごとのグループもあります。",
  en: "Chat: besides this group, there are group chats for each class year.",
};
const PARENT_CHAT: Step = {
  ja: "チャット：このグループのほか、お子さまの学年の保護者グループもあります。",
  en: "Chat: besides this group, there is a parents' group for your child's class year.",
};
const TEACHER_CHAT: Step = {
  ja: "チャット：このグループで教職員どうし連絡を取り合えます。",
  en: "Chat: use this group to keep in touch with other teachers and staff.",
};
const FAMILY: Step = {
  ja: "家族：お子さまやご家族のアカウントとつなげると、家族のページで互いを確認できます。",
  en: "Family: link your children's and family members' accounts to see each other on the Family page.",
};
const STUDENT_FAMILY: Step = {
  ja: "家族：保護者のアカウントとつなげられます。",
  en: "Family: you can link your account with your parents'.",
};
const INVITE: Step = {
  ja: "同窓生を招待：まだ登録していない同級生や先生に招待リンクを送れます。",
  en: "Invite alumni: send an invite link to classmates and teachers who haven't joined yet.",
};
const LINE: Step = {
  ja: "設定 →「LINE連携」：ニュースやイベントのお知らせがLINEで届きます（未連携の方にはメールで届きます）。",
  en: "Settings → LINE: get news and event reminders on LINE (or by email if you don't link LINE).",
};

const STEPS: Record<LaunchKind, Step[]> = {
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

const NUM = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];

/** The launch message for one group chat, signed with the sender's name. */
export function launchMessage(
  kind: LaunchKind,
  sender: { nameKanji: string | null; nameRomaji: string | null },
): string {
  const ja = sender.nameKanji ?? sender.nameRomaji ?? "";
  const en = sender.nameRomaji ?? sender.nameKanji ?? "";
  const steps = STEPS[kind];
  const body = [
    LAUNCH_TITLE_JA,
    INTRO[kind].ja,
    ["【かんたんな使い方】", ...steps.map((s, i) => `${NUM[i]} ${s.ja}`)].join(
      "\n",
    ),
    "分からないことは、メニューの「お問い合わせ」からいつでもどうぞ。これからよろしくお願いします！",
    ja ? `— ${ja}` : "",
    "――――――――――",
    "🎉 Welcome to the AIS Alumni app!",
    INTRO[kind].en,
    ["[Getting started]", ...steps.map((s, i) => `${i + 1}. ${s.en}`)].join(
      "\n",
    ),
    "Questions? Use “Contact & support” in the menu any time. We're glad to have you here!",
    en ? `— ${en}` : "",
  ];
  return body.filter(Boolean).join("\n\n").slice(0, MAX_CHAT_MESSAGE);
}
