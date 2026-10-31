
import { Bot, InlineKeyboard, InputFile } from "grammy";

const TOKEN = process.env.BOT_TOKEN;
const CHANNEL = "@ShunchakiMusiqaUz";
const REQUIRED_CHANNEL = "@ShunchakiMusiqaUz";
const JAMENDO_ID = process.env.JAMENDO_CLIENT_ID;

if (!TOKEN || !JAMENDO_ID) {
  throw new Error("BOT_TOKEN yoki JAMENDO_CLIENT_ID topilmadi!");
}

const bot = new Bot(TOKEN);
const results = new Map();

const subscribeKeyboard = new InlineKeyboard()
  .url("📢 Kanalga obuna bo'lish", "https://t.me/ShunchakiMusiqaUz")
  .row()
  .text("✅ Obunani tekshirish", "check_sub");

async function isSubscribed(userId) {
  try {
    const member = await bot.api.getChatMember(
      REQUIRED_CHANNEL,
      userId
    );
    return ["member", "administrator", "creator"]
      .includes(member.status);
  } catch {
    return false;
  }
}

bot.command("start", async (ctx) => {
  const ok = await isSubscribed(ctx.from.id);

  if (!ok) {
    return ctx.reply(
      "🎵 MEGA MUSIC BOT\n\nDavom etish uchun kanalga obuna bo'ling!",
      { reply_markup: subscribeKeyboard }
    );
  }

  await ctx.reply(
    "🎧 MEGA MUSIC BOT\n\nQo'shiq nomini yozing, men qidirib beraman!"
  );
});

bot.callbackQuery("check_sub", async (ctx) => {
  const ok = await isSubscribed(ctx.from.id);

  if (ok) {
    await ctx.answerCallbackQuery({
      text: "Obuna tasdiqlandi! ✅"
    });
    await ctx.reply("🎵 Qo'shiq nomini yuboring!");
  } else {
    await ctx.answerCallbackQuery({
      text: "Avval kanalga obuna bo'ling!",
      show_alert: true
    });
  }
});

bot.on("message:text", async (ctx) => {
  const query = ctx.message.text.trim();

  if (query.startsWith("/")) return;

  if (!(await isSubscribed(ctx.from.id))) {
    return ctx.reply(
      "Avval kanalga obuna bo'ling!",
      { reply_markup: subscribeKeyboard }
    );
  }

  await ctx.reply("🔎 Musiqa qidirilmoqda...");

  try {
    const url = new URL(
      "https://api.jamendo.com/v3.0/tracks/"
    );

    url.searchParams.set("client_id", JAMENDO_ID);
    url.searchParams.set("format", "json");
    url.searchParams.set("search", query);
    url.searchParams.set("limit", "5");
    url.searchParams.set("audioformat", "mp32");
    url.searchParams.set("audiodlformat", "mp32");
    url.searchParams.set("include", "licenses");

    const response = await fetch(url);
    const data = await response.json();

    const tracks = (data.results || []).filter(
      track => track.audiodownload_allowed &&
               track.audiodownload
    );

    if (!tracks.length) {
      return ctx.reply("😔 Yuklab olishga ruxsat berilgan musiqa topilmadi.");
    }

    results.set(ctx.from.id, tracks);

    const keyboard = new InlineKeyboard();

    tracks.forEach((track, i) => {
      keyboard.text(
        `🎵 ${track.name} — ${track.artist_name}`,
        `track_${i}`
      ).row();
    });

    await ctx.reply("🎧 Topilgan musiqalar:", {
      reply_markup: keyboard
    });

  } catch (error) {
    console.error(error);
    await ctx.reply("❌ Qidirishda xatolik yuz berdi.");
  }
});

bot.on("callback_query:data", async (ctx) => {
  const match = ctx.callbackQuery.data.match(/^track_(\d+)$/);
  if (!match) return;

  if (!(await isSubscribed(ctx.from.id))) {
    await ctx.answerCallbackQuery({
      text: "Avval kanalga obuna bo'ling!",
      show_alert: true
    });
    return;
  }

  const tracks = results.get(ctx.from.id);
  const track = tracks?.[Number(match[1])];

  if (!track) {
    return ctx.answerCallbackQuery({
      text: "Musiqa topilmadi."
    });
  }

  await ctx.answerCallbackQuery("Yuklanmoqda...");
  await ctx.reply("📥 MP3 tayyorlanmoqda...");

  try {
    const download = await fetch(track.audiodownload);

    if (!download.ok) {
      throw new Error("Download failed");
    }

    const size = Number(download.headers.get("content-length") || 0);

    if (size > 48 * 1024 * 1024) {
      throw new Error("Audio file too large");
    }

    const buffer = Buffer.from(await download.arrayBuffer());

    if (buffer.length > 48 * 1024 * 1024) {
      throw new Error("Audio file too large");
    }

    const audio = new InputFile(
      buffer,
      `${track.name}.mp3`
    );

    const caption =
      `🎧 SHUNCHAKI MUSIQA UZ\n\n` +
      `🎵 Nomi: ${track.name}\n` +
      `🎤 Ijrochi: ${track.artist_name}\n` +
      `🔗 Manba: Jamendo\n` +
      `📢 @ShunchakiMusiqaUz`;

    await bot.api.sendAudio(CHANNEL, audio, {
      title: track.name,
      performer: track.artist_name,
      caption
    });

    await ctx.reply("✅ Musiqa kanalingizga joylandi!");

    await ctx.replyWithAudio(
      new InputFile(buffer, `${track.name}.mp3`),
      {
        title: track.name,
        performer: track.artist_name
      }
    );

  } catch (error) {
    console.error(error);
    await ctx.reply(
      "❌ Musiqani yuklashda xatolik yuz berdi."
    );
  }
});

bot.catch((error) => {
  console.error("Bot xatosi:", error);
});

bot.start();
console.log("MEGA MUSIC BOT ishga tushdi!");

