
import { Bot, InlineKeyboard, InputFile } from "grammy";

const TOKEN =
  process.env.BOT_TOKEN ||
  process.env.TELEGRAM_BOT_TOKEN;

const CHANNEL = "@ShunchakiMusiqaUz";
const API = "https://api.freetouse.com/v3";

if (!TOKEN) throw new Error("BOT_TOKEN topilmadi!");

const bot = new Bot(TOKEN);
const searches = new Map();

const subKeyboard = new InlineKeyboard()
  .url("📢 Kanalga obuna bo'lish", "https://t.me/ShunchakiMusiqaUz")
  .row()
  .text("✅ Obunani tekshirish", "check_sub");

async function subscribed(id) {
  try {
    const m = await bot.api.getChatMember(CHANNEL, id);
    return ["member", "administrator", "creator"].includes(m.status);
  } catch {
    return false;
  }
}

bot.command("start", async (ctx) => {
  if (!(await subscribed(ctx.from.id))) {
    return ctx.reply(
      "🎧 MEGA MUSIC BOT\n\nBotdan foydalanish uchun kanalga obuna bo'ling!",
      { reply_markup: subKeyboard }
    );
  }

  await ctx.reply(
    "🎵 MEGA MUSIC BOT\n\nQo'shiq nomini yozing va qidirishni boshlang!"
  );
});

bot.callbackQuery("check_sub", async (ctx) => {
  if (await subscribed(ctx.from.id)) {
    await ctx.answerCallbackQuery("Obuna tasdiqlandi! ✅");
    await ctx.reply("🎵 Endi qo'shiq nomini yuboring!");
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

  if (!(await subscribed(ctx.from.id))) {
    return ctx.reply("Avval kanalga obuna bo'ling!", {
      reply_markup: subKeyboard
    });
  }

  await ctx.reply("🔎 Musiqa qidirilmoqda...");

  try {
    const url = new URL(`${API}/music/tracks/search`);
    url.searchParams.set("query", query);
    url.searchParams.set("limit", "8");
    url.searchParams.set("order", "plays");
    url.searchParams.set("sort", "desc");

    const response = await fetch(url);
    if (!response.ok) throw new Error("API javob bermadi");

    const json = await response.json();

    const tracks = (json.data || []).filter(
      t => !t.is_premium && t.files?.mp3
    );

    if (!tracks.length) {
      return ctx.reply("😔 Mos bepul musiqa topilmadi.");
    }

    searches.set(ctx.from.id, tracks);

    const keyboard = new InlineKeyboard();

    tracks.forEach((t, i) => {
      const artist = t.artists?.map(a => a[1]?.name).filter(Boolean).join(", ");
      keyboard.text(
        `🎵 ${t.title} — ${artist || "Noma'lum"}`.slice(0, 60),
        `track_${i}`
      ).row();
    });

    await ctx.reply("🎧 Topilgan musiqalar:", {
      reply_markup: keyboard
    });

  } catch (e) {
    console.error(e);
    await ctx.reply("❌ Qidirishda xatolik. Keyinroq urinib ko'ring.");
  }
});

bot.callbackQuery(/^track_(\d+)$/, async (ctx) => {
  if (!(await subscribed(ctx.from.id))) {
    await ctx.answerCallbackQuery({
      text: "Avval kanalga obuna bo'ling!",
      show_alert: true
    });
    return;
  }

  const tracks = searches.get(ctx.from.id);
  const track = tracks?.[Number(ctx.match[1])];

  if (!track) {
    return ctx.answerCallbackQuery("Musiqa topilmadi!");
  }

  await ctx.answerCallbackQuery("Yuklanmoqda...");
  await ctx.reply("📥 MP3 tayyorlanmoqda...");

  try {
    const response = await fetch(track.files.mp3);
    if (!response.ok) throw new Error("Audio yuklanmadi");

    const length = Number(response.headers.get("content-length") || 0);
    if (length > 49 * 1024 * 1024) {
      throw new Error("Fayl juda katta");
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (!buffer.length || buffer.length > 49 * 1024 * 1024) {
      throw new Error("Audio hajmi mos emas");
    }

    const artist = track.artists
      ?.map(a => a[1]?.name)
      .filter(Boolean)
      .join(", ") || "Noma'lum";

    const filename =
      (track.title || "music").replace(/[^\w.-]/g, "_") + ".mp3";

    const caption =
      `🎧 SHUNCHAKI MUSIQA UZ\n\n` +
      `🎵 Nomi: ${track.title}\n` +
      `🎤 Ijrochi: ${artist}\n` +
      `🎶 Manba: Free To Use\n` +
      `📢 @ShunchakiMusiqaUz`;

    // Avval kanalga joylash
    await bot.api.sendAudio(
      CHANNEL,
      new InputFile(buffer, filename),
      {
        title: track.title,
        performer: artist,
        caption
      }
    );

    // Keyin foydalanuvchiga yuborish
    await ctx.replyWithAudio(
      new InputFile(buffer, filename),
      {
        title: track.title,
        performer: artist,
        caption: "✅ Musiqa kanalingizga joylandi!"
      }
    );

  } catch (e) {
    console.error(e);
    await ctx.reply("❌ Yuklash yoki kanalga joylashda xatolik yuz berdi.");
  }
});

bot.catch(err => console.error("Bot xatosi:", err));

bot.start();
console.log("MEGA MUSIC BOT ishga tushdi!");
