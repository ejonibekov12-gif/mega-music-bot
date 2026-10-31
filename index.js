
import { Bot, InlineKeyboard } from "grammy";

const TOKEN =
  process.env.BOT_TOKEN ||
  process.env.TELEGRAM_BOT_TOKEN;

const CHANNEL = "@ShunchakiMusiqaUz";

if (!TOKEN) throw new Error("Bot token topilmadi!");

const bot = new Bot(TOKEN);

const keyboard = new InlineKeyboard()
  .url("📢 Kanalga obuna bo‘lish", "https://t.me/ShunchakiMusiqaUz")
  .row()
  .text("✅ Obunani tekshirish", "check_sub");

async function isSubscribed(userId) {
  try {
    const member = await bot.api.getChatMember(CHANNEL, userId);
    return ["member", "administrator", "creator"].includes(member.status);
  } catch (error) {
    console.error("Obuna tekshirish xatosi:", error);
    return false;
  }
}

bot.command("start", async (ctx) => {
  if (!(await isSubscribed(ctx.from.id))) {
    return ctx.reply(
      "🎧 MEGA MUSIC BOT\n\nBotdan foydalanish uchun kanalga obuna bo‘ling!",
      { reply_markup: keyboard }
    );
  }

  return ctx.reply(
    "🎵 MEGA MUSIC BOT\n\nMenga MP3 musiqa yuboring. Men uni avtomatik kanalingizga joylayman!"
  );
});

bot.callbackQuery("check_sub", async (ctx) => {
  if (await isSubscribed(ctx.from.id)) {
    await ctx.answerCallbackQuery("Obuna tasdiqlandi! ✅");
    await ctx.reply("🎵 Endi musiqa yuborishingiz mumkin!");
  } else {
    await ctx.answerCallbackQuery({
      text: "Avval kanalga obuna bo‘ling!",
      show_alert: true
    });
  }
});

bot.on("message:audio", async (ctx) => {
  if (!(await isSubscribed(ctx.from.id))) {
    return ctx.reply("Avval kanalga obuna bo‘ling!", {
      reply_markup: keyboard
    });
  }

  const audio = ctx.message.audio;
  const title = audio.title || "Noma'lum qo‘shiq";
  const artist = audio.performer || "Noma'lum ijrochi";

  const caption =
    "━━━━━━━━━━━━━━━━━━\n" +
    "🎧 SHUNCHAKI MUSIQA UZ\n" +
    "━━━━━━━━━━━━━━━━━━\n\n" +
    `🎵 Nomi: ${title}\n` +
    `🎤 Ijrochi: ${artist}\n\n` +
    "🎶 Musiqadan zavqlaning!\n\n" +
    "📢 @ShunchakiMusiqaUz";

  try {
    await ctx.api.sendAudio(CHANNEL, audio.file_id, {
      caption,
      title,
      performer: artist
    });

    await ctx.reply("✅ Musiqa kanalga joylandi!");
  } catch (error) {
    console.error("Kanalga joylash xatosi:", error);
    await ctx.reply("❌ Xatolik! Bot kanal administratori ekanini tekshiring.");
  }
});

bot.on("message:document", async (ctx) => {
  await ctx.reply("Musiqani Telegram orqali Audio/MP3 shaklida yuboring.");
});

bot.catch((error) => {
  console.error("Bot xatosi:", error);
});

bot.start();
console.log("MEGA MUSIC BOT ishga tushdi!");
