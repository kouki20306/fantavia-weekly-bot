require("dotenv").config();

const { WebClient } = require("@slack/web-api");

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

async function main() {
  try {

    const weeklyReport = `
💮月曜日になりました！今週の週報です！

【先週のToDo】
※前回の週報の「今週のToDo」をコピーして貼り付けてください。
※完了したToDoには「✅」を付けてください。

【達成度と感想】

【今週のToDo】
・
・
・

⏰ 本日23:59までに投稿をお願いします！

今週も頑張ろう！💪
`;

    await client.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: weeklyReport
    });

    console.log("送信成功！");
  } catch (error) {
    console.error(error);
  }
}

main();