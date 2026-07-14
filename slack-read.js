require("dotenv").config();
const { WebClient } = require("@slack/web-api");

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const channel = process.env.SLACK_CHANNEL_ID;

async function main() {
  // 1. Botが投稿した最新のメッセージ（週報テンプレ）を探す
  const history = await slack.conversations.history({
    channel,
    limit: 20,
  });

  const parent = history.messages.find((m) => m.bot_id && m.thread_ts);
  if (!parent) {
    console.log("週報の投稿が見つかりません（スレッド返信がまだ無いかも）");
    return;
  }

  console.log("親メッセージ ts:", parent.ts);

  // 2. そのスレッドの返信を全部取る
  const thread = await slack.conversations.replies({
    channel,
    ts: parent.ts,
  });

  // 3. 親を除いた返信だけを表示
  const replies = thread.messages.filter((m) => m.ts !== parent.ts);

  for (const r of replies) {
    const user = await slack.users.info({ user: r.user });
    const name = user.user.profile.display_name || user.user.real_name;

    console.log("──────────────");
    console.log("返信者:", name);
    console.log(r.text);
  }
}

main().catch((e) => console.error("エラー:", e.data || e.message));