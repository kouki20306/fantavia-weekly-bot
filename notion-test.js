require("dotenv").config();
const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function main() {
  const res = await notion.pages.create({
    parent: { database_id: process.env.NOTION_DB_ID },
    properties: {
      "タスク名": {
        title: [{ text: { content: "テストタスク" } }],
      },
      "担当": {
        select: { name: "kou" },
      },
      "ステータス": {
        status: { name: "未着手" },
      },
      "日付": {
        date: { start: "2026-07-14" },
      },
    },
  });
  console.log("追加成功！", res.id);
}

main().catch((e) => console.error("エラー:", e.body || e.message));