# Notifications (通知一覧)

Generated from `src/lib/notify/catalog.ts` and `messages/*/notifications.json`.

Rules: LINE shows `emoji title / body / button ▶ short link`; email adds the detail, the committee note (if any) and a footer. Links are per-member short links `/n/<member code>/<token>`: opening one records that member's read receipt (shown to admins as 「通知の開封」 on news, events and messages). Members can turn off every category except アカウント.


## アカウント・申請結果 / Account & your requests

| Kind | 日本語 (タイトル — 本文) | English (title — body) | Email always |
|---|---|---|---|
| `VERIFICATION_APPROVED` 🎉 | **登録が承認されました** — AIS同窓会の会員登録が承認されました。 | **Your registration was approved** — Your AIS Alumni membership has been approved. | ✓ |
| `VERIFICATION_REJECTED` 📋 | **登録が承認されませんでした** — 申請内容を確認しましたが、今回は承認できませんでした。 | **Your registration wasn't approved** — We checked your application but couldn't approve it this time. | ✓ |
| `VERIFICATION_NEEDS_INFO` 📝 | **申請内容の確認をお願いします** — 委員会から申請内容について確認のお願いがあります。 | **Please check your application** — The committee has a question about your application. | ✓ |
| `SECURITY_METHOD_ADDED` 🔐 | **ログイン方法が追加されました** — アカウントに「{method}」のログインが追加されました。 | **A sign-in method was added** — {method} sign-in was added to your account. | ✓ |
| `SECURITY_METHOD_REMOVED` 🔐 | **ログイン方法が削除されました** — アカウントから「{method}」のログインが削除されました。 | **A sign-in method was removed** — {method} sign-in was removed from your account. | ✓ |
| `ACCOUNT_DEACTIVATED_SELF` 👋 | **アカウントを無効にしました** — ご自身の操作でアカウントが無効になりました。 | **Your account was deactivated** — You deactivated your account. | ✓ |
| `ACCOUNT_DEACTIVATED` ⏸️ | **アカウントが無効になりました** — 委員会によりアカウントが無効になりました。 | **Your account was deactivated** — The committee deactivated your account. | ✓ |
| `ACCOUNT_REACTIVATED` ▶️ | **アカウントが再開されました** — アカウントが再び利用できるようになりました。 | **Your account is active again** — Your account can be used again. |  |
| `NAME_REQUEST_APPROVED` ✅ | **氏名の変更が承認されました** — 申請した氏名に変更しました。 | **Your name change was approved** — Your name has been updated. |  |
| `NAME_REQUEST_REJECTED` 📋 | **氏名の変更は承認されませんでした** — 氏名の変更申請は承認されませんでした。 | **Your name change wasn't approved** — Your name change request wasn't approved. |  |
| `BIRTH_DATE_REQUEST_APPROVED` ✅ | **生年月日の変更が承認されました** — 申請した生年月日に変更しました。 | **Your date of birth was updated** — Your date of birth change was approved. |  |
| `BIRTH_DATE_REQUEST_REJECTED` 📋 | **生年月日の変更は承認されませんでした** — 生年月日の変更申請は承認されませんでした。 | **Your date of birth change wasn't approved** — Your date of birth request wasn't approved. |  |
| `GENDER_REQUEST_APPROVED` ✅ | **性別の変更が承認されました** — 申請した性別に変更しました。 | **Your gender was updated** — Your gender change was approved. |  |
| `GENDER_REQUEST_REJECTED` 📋 | **性別の変更は承認されませんでした** — 性別の変更申請は承認されませんでした。 | **Your gender change wasn't approved** — Your gender change request wasn't approved. |  |
| `RECORD_REQUEST_APPROVED` ✅ | **在籍記録の修正が承認されました** — AIS在籍記録を修正しました。 | **Your record correction was approved** — Your AIS record has been corrected. |  |
| `RECORD_REQUEST_REJECTED` 📋 | **在籍記録の修正は承認されませんでした** — 在籍記録の修正申請は承認されませんでした。 | **Your record correction wasn't approved** — Your record correction request wasn't approved. |  |

## ニュース / News

| Kind | 日本語 (タイトル — 本文) | English (title — body) | Email always |
|---|---|---|---|
| `NEWS` 📰 | **新しいニュースがあります** — AIS同窓会委員会からニュースが届きました。 | **New news from the committee** — The AIS Alumni Committee posted news. |  |
| `NEWS_REMINDER` ⏰ | **回答期限が近づいています** — まだ回答していないニュースがあります。 | **A response deadline is near** — There's a news post you haven't responded to yet. |  |
| `BROADCAST` ✉️ | **{from}からお知らせが届きました** — {from}からお知らせが届きました。 | **A message from {from}** — {from} sent you a message. |  |

## イベント / Events

| Kind | 日本語 (タイトル — 本文) | English (title — body) | Email always |
|---|---|---|---|
| `EVENT_REMINDER_7D` 📅 | **来週のイベントのお知らせ** — 「{title}」は {when} からです。 | **Event next week** — “{title}” starts {when}. |  |
| `EVENT_REMINDER_1D` 📅 | **明日のイベントのお知らせ** — 「{title}」は明日 {when} からです。 | **Event tomorrow** — “{title}” is tomorrow, {when}. |  |

## チャット / Chat

1:1 messages and personal @mentions are sent once (LINE, or email) if still unread after 5 minutes; nothing more until the chat is read. The delay and once-per-streak keep LINE pushes within the monthly quota.

| Kind | 日本語 (タイトル — 本文) | English (title — body) | Email always |
|---|---|---|---|
| `CHAT_DIRECT` 💬 | **新しいメッセージがあります** — {name}さんから1対1のメッセージが届いています。 | **You have a new message** — {name} sent you a direct message. |  |
| `CHAT_MENTION` 💬 | **メンションされました** — {name}さんがチャットであなたをメンションしました（未読）。 | **You were mentioned** — {name} mentioned you in a chat (unread). |  |
| `CHAT_DIGEST` 💬 | **未読のチャットがあります** — グループチャットに未読のメッセージが{count}件あります。 | **You have unread chat messages** — You have {count, plural, one {# unread message} other {# unread messages}} in your group chats. |  |

## フォロー・知り合い確認 / Follows & vouching

| Kind | 日本語 (タイトル — 本文) | English (title — body) | Email always |
|---|---|---|---|
| `FOLLOW_REQUEST` 👤 | **フォローリクエストが届きました** — {name}さんからフォローリクエストが届きました。 | **New follow request** — {name} wants to follow you. |  |
| `FOLLOW_AUTO_ACCEPTED` 👤 | **新しいフォロワーがいます** — {name}さんがあなたをフォローしました。 | **You have a new follower** — {name} followed you. |  |
| `FOLLOW_ACCEPTED` 🤝 | **フォローが承認されました** — {name}さんがフォローリクエストを承認しました。 | **Your follow request was accepted** — {name} accepted your follow request. |  |
| `VOUCH_REQUEST` 🙋 | **ご存じの方か教えてください** — {name}さんがあなたを知り合いとして挙げて入会を申請しています。 | **Do you know this person?** — {name} applied to join and named you as someone who knows them. |  |

## 家族 / Family

| Kind | 日本語 (タイトル — 本文) | English (title — body) | Email always |
|---|---|---|---|
| `FAMILY_LINK_REQUEST_AS_CHILD` 👨‍👩‍👧 | **家族の確認をお願いします** — {name}さんがあなたの保護者として家族の登録を申請しています。 | **Please confirm your family** — {name} says they're your parent. |  |
| `FAMILY_LINK_REQUEST_AS_PARENT` 👨‍👩‍👧 | **家族の確認をお願いします** — {name}さんがあなたを保護者として家族の登録を申請しています。 | **Please confirm your family** — {name} says you're their parent. |  |
| `FAMILY_HANDOVER_DONE` 🔑 | **アカウントの引き継ぎが完了しました** — {child}さんがアカウントを引き継ぎました。 | **The account handover is complete** — {child} has taken over their account. |  |

## プロフィールのお願い / Profile reminders

| Kind | 日本語 (タイトル — 本文) | English (title — body) | Email always |
|---|---|---|---|
| `STAGE_PROMPT` 🎓 | **学歴・職歴を更新しませんか** — 新年度になりました。現在の状況は「{stage}」です。 | **Update your education & work?** — A new school year has started. Your current status is “{stage}”. |  |

## 管理（委員会の作業） / Admin work

| Kind | 日本語 (タイトル — 本文) | English (title — body) | Email always |
|---|---|---|---|
| `NAME_REQUEST_ADMIN` 🗂️ | **氏名の変更申請があります** — {name}さんから氏名の変更申請がありました。 | **New name change request** — {name} asked to change their name. |  |
| `BIRTH_DATE_REQUEST_ADMIN` 🗂️ | **生年月日の変更申請があります** — {name}さんから生年月日の登録・変更申請がありました。 | **New date of birth request** — {name} asked to add or correct their date of birth. |  |
| `GENDER_REQUEST_ADMIN` 🗂️ | **性別の変更申請があります** — {name}さんから性別の変更申請がありました。 | **New gender change request** — {name} asked to change their gender. |  |
| `RECORD_REQUEST_ADMIN` 🗂️ | **在籍記録の修正申請があります** — {name}さんから在籍記録の修正申請がありました。 | **New record correction request** — {name} asked to correct their AIS record. |  |
