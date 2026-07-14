require("dotenv").config();
const { WebClient } = require("@slack/web-api");
const { Client } = require("@notionhq/client");

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const channel = process.env.SLACK_CHANNEL_ID;
const dbId = process.env.NOTION_DB_ID;

const norm = (s) =>
  s.replace(/:white_check_mark:/g, "").replace(/[・\-\s　✅]/g, "").trim();

function parse(text) {
  const lines = text.split("\n");
  const done = [];
  const todos = [];
  let mode = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.includes("先週のToDo")) { mode = "last"; continue; }
    if (line.includes("達成度"))     { mode = null;   continue; }
    if (line.includes("今週のToDo")) { mode = "this"; continue; }

    if (mode === "last" && (line.includes("✅") || line.includes(":white_check_mark:"))) {
      done.push(
        line
          .replace("✅", "")
          .replace(":white_check_mark:", "")
          .replace(/^・/, "")
          .trim()
      );
    }
    if (mode === "this") {
      todos.push(line.replace(/^・/, "").trim());
    }
  }
  return { done, todos };
}

async function main() {
  const history = await slack.conversations.history({ channel, limit: 20 });
  const parent = history.messages.find((m) => m.bot_id && m.thread_ts);
  if (!parent) return console.log("週報スレッドが見つかりません");

  const thread = await slack.conversations.replies({ channel, ts: parent.ts });
  const replies = thread.messages.filter((m) => m.ts !== parent.ts);

  const today = new Date().toISOString().slice(0, 10);

  for (const r of replies) {
    const u = await slack.users.info({ user: r.user });
    const name = u.user.profile.display_name || u.user.real_name;
    const { done, todos } = parse(r.text);

    console.log(`\n=== ${name} ===`);

    const existing = await notion.databases.query({
      database_id: dbId,
      filter: { property: "担当", select: { equals: name } },
    });

    // ✅付き → 完了に更新
    for (const d of done) {
      const hit = existing.results.find((p) => {
        const title = p.properties["タスク名"].title[0]?.plain_text || "";
        return norm(title) === norm(d);
      });

      if (hit) {
        await notion.pages.update({
          page_id: hit.id,
          properties: { "ステータス": { status: { name: "完了" } } },
        });
        console.log(`✅ 完了にしました: ${d}`);
      } else {
        console.log(`⚠️ 該当タスクが見つかりません: ${d}`);
      }
    }

    // 今週のToDo → 追加（重複はスキップ）
    const doneNorm = done.map(norm);

    for (const t of todos) {
      const dup = existing.results.find((p) => {
        const title = p.properties["タスク名"].title[0]?.plain_text || "";
        const status = p.properties["ステータス"].status?.name || "";
        return (
          norm(title) === norm(t) &&
          status !== "完了" &&
          !doneNorm.includes(norm(t))
        );
      });

      if (dup) {
        console.log(`↩️ 既にあるのでスキップ: ${t}`);
        continue;
      }

      await notion.pages.create({
        parent: { database_id: dbId },
        properties: {
          "タスク名": { title: [{ text: { content: t } }] },
          "担当": { select: { name } },
          "ステータス": { status: { name: "未着手" } },
          "日付": { date: { start: today } },
        },
      });
      console.log(`➕ 追加しました: ${t}`);
    }
  }
}

main().catch((e) => console.error("エラー:", e.body || e.data || e.message));