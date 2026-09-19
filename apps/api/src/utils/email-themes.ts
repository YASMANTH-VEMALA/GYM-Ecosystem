export interface EmailThemeConfig {
  id: string;
  label: string;
  emoji: string;
  bannerEmojis: string;
  gradient: string;
  accent: string;
  headerColor: string;
  subtextColor: string;
}

export const EMAIL_THEMES: Record<string, EmailThemeConfig> = {
  birthday: {
    id: 'birthday',
    label: 'Birthday Celebration',
    emoji: '🎂',
    bannerEmojis: '🎈 ✨ 🎂 🎁 🎉 🥳',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
    accent: '#7c3aed',
    headerColor: '#ffffff',
    subtextColor: '#f3e8ff',
  },
  celebration: {
    id: 'celebration',
    label: 'Celebration',
    emoji: '🎉',
    bannerEmojis: '🥂 ✨ 🎉 🎊 🌟 🎆',
    gradient: 'linear-gradient(135deg, #d97706 0%, #dc2626 100%)',
    accent: '#d97706',
    headerColor: '#ffffff',
    subtextColor: '#fef3c7',
  },
  diwali: {
    id: 'diwali',
    label: 'Happy Diwali',
    emoji: '🪔',
    bannerEmojis: '🪔 ✨ 🌟 🎆 🎇 💛',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #ca8a04 100%)',
    accent: '#ea580c',
    headerColor: '#fef08a',
    subtextColor: '#fed7aa',
  },
  sankranti: {
    id: 'sankranti',
    label: 'Happy Makar Sankranti',
    emoji: '🪁',
    bannerEmojis: '🪁 ☀️ 🌾 🌿 🎋 💚',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #15803d 100%)',
    accent: '#ea580c',
    headerColor: '#fef9c3',
    subtextColor: '#bbf7d0',
  },
  ganesh: {
    id: 'ganesh',
    label: 'Ganesh Chaturthi',
    emoji: '🐘',
    bannerEmojis: '🐘 🌺 ✨ 🪔 🌸 🎊',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #b45309 100%)',
    accent: '#c2410c',
    headerColor: '#fef3c7',
    subtextColor: '#fde68a',
  },
  eid: {
    id: 'eid',
    label: 'Eid Mubarak',
    emoji: '🌙',
    bannerEmojis: '🌙 ⭐ ✨ 🕌 🌟 💚',
    gradient: 'linear-gradient(135deg, #14532d 0%, #15803d 50%, #713f12 100%)',
    accent: '#15803d',
    headerColor: '#fef9c3',
    subtextColor: '#bbf7d0',
  },
  christmas: {
    id: 'christmas',
    label: 'Merry Christmas',
    emoji: '🎄',
    bannerEmojis: '🎄 ❄️ ⛄ 🎁 🌟 ✨',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #14532d 100%)',
    accent: '#dc2626',
    headerColor: '#ffffff',
    subtextColor: '#fecaca',
  },
  newyear: {
    id: 'newyear',
    label: 'Happy New Year',
    emoji: '🎆',
    bannerEmojis: '🎆 🥂 🎊 ✨ 🌟 🎇',
    gradient: 'linear-gradient(135deg, #09090b 0%, #1e1b4b 50%, #ca8a04 100%)',
    accent: '#ca8a04',
    headerColor: '#fef9c3',
    subtextColor: '#fde047',
  },
  motivation: {
    id: 'motivation',
    label: 'Daily Motivation',
    emoji: '🔥',
    bannerEmojis: '🔥 💪 ⚡ 🎯 🏋️ 💥',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #c2410c 100%)',
    accent: '#dc2626',
    headerColor: '#ffffff',
    subtextColor: '#fed7aa',
  },
  fitness: {
    id: 'fitness',
    label: 'Fitness Goals',
    emoji: '💪',
    bannerEmojis: '💪 🏃 ⚡ 🎯 🏋️ 🥇',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0e7490 100%)',
    accent: '#1d4ed8',
    headerColor: '#ffffff',
    subtextColor: '#bae6fd',
  },
  fee_reminder: {
    id: 'fee_reminder',
    label: 'Fee Reminder',
    emoji: '💰',
    bannerEmojis: '💰 📅 ⏰ 🔔 💳 📋',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #ca8a04 100%)',
    accent: '#d97706',
    headerColor: '#ffffff',
    subtextColor: '#fef3c7',
  },
  overdue: {
    id: 'overdue',
    label: 'Urgent Overdue Notice',
    emoji: '⚠️',
    bannerEmojis: '⚠️ 🔴 📅 ⏰ 🔔 ❗',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #831843 100%)',
    accent: '#dc2626',
    headerColor: '#ffffff',
    subtextColor: '#fecdd3',
  },
  achievement: {
    id: 'achievement',
    label: 'Achievement Unlocked',
    emoji: '🌟',
    bannerEmojis: '🌟 🏆 🥇 ✨ 🎖️ 👑',
    gradient: 'linear-gradient(135deg, #713f12 0%, #ca8a04 50%, #d97706 100%)',
    accent: '#ca8a04',
    headerColor: '#ffffff',
    subtextColor: '#fef9c3',
  },
  gym_update: {
    id: 'gym_update',
    label: 'Gym Update',
    emoji: '📣',
    bannerEmojis: '📣 📢 🔔 💬 📋 ✅',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #4c1d95 100%)',
    accent: '#2563eb',
    headerColor: '#ffffff',
    subtextColor: '#e0e7ff',
  },
  welcome: {
    id: 'welcome',
    label: 'Welcome to the Family',
    emoji: '❤️',
    bannerEmojis: '❤️ 🤝 ✨ 🌟 😊 🏠',
    gradient: 'linear-gradient(135deg, #134e4a 0%, #0d9488 50%, #14532d 100%)',
    accent: '#0d9488',
    headerColor: '#ffffff',
    subtextColor: '#ccfbf1',
  },
  miss_you: {
    id: 'miss_you',
    label: 'We Miss You!',
    emoji: '😢',
    bannerEmojis: '😢 💙 🤗 🙏 👋 💌',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #4c1d95 100%)',
    accent: '#4338ca',
    headerColor: '#ffffff',
    subtextColor: '#e0e7ff',
  },
  challenge: {
    id: 'challenge',
    label: 'Gym Challenge',
    emoji: '🏆',
    bannerEmojis: '🏆 ⚡ 🔥 💪 🎯 🥊',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #713f12 100%)',
    accent: '#ea580c',
    headerColor: '#ffffff',
    subtextColor: '#fef3c7',
  },
  holi: {
    id: 'holi',
    label: 'Happy Holi',
    emoji: '🌸',
    bannerEmojis: '🌸 🎨 🌈 ✨ 💜 🌺',
    gradient: 'linear-gradient(135deg, #831843 0%, #ec4899 40%, #f97316 70%, #8b5cf6 100%)',
    accent: '#ec4899',
    headerColor: '#ffffff',
    subtextColor: '#fdf4ff',
  },
  milestone: {
    id: 'milestone',
    label: 'Milestone Celebrations',
    emoji: '🎓',
    bannerEmojis: '🎓 🏅 🌟 ✨ 👏 🥳',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #713f12 100%)',
    accent: '#1e3a8a',
    headerColor: '#ffffff',
    subtextColor: '#fef9c3',
  },
  wellness: {
    id: 'wellness',
    label: 'Wellness & Health',
    emoji: '🧘',
    bannerEmojis: '🧘 🌿 💚 🌱 🌸 ☮️',
    gradient: 'linear-gradient(135deg, #14532d 0%, #16a34a 50%, #134e4a 100%)',
    accent: '#16a34a',
    headerColor: '#ffffff',
    subtextColor: '#dcfce7',
  },
};

export interface RenderThemedEmailOptions {
  theme?: string;
  gymName: string;
  gymLogoUrl?: string;
  title: string;
  body: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isImageAttachment(url?: string, mimeType?: string): boolean {
  if (!url) return false;
  if (mimeType?.startsWith('image/')) return true;
  return /\.(png|jpg|jpeg|webp|gif)($|\?)/i.test(url);
}

export function renderThemedEmail(options: RenderThemedEmailOptions): string {
  const {
    theme: themeId,
    gymName,
    gymLogoUrl,
    title,
    body,
    attachmentUrl,
    attachmentName,
    attachmentType,
  } = options;

  const themeConfig = (themeId && EMAIL_THEMES[themeId]) || EMAIL_THEMES['gym_update'];
  const isImage = isImageAttachment(attachmentUrl, attachmentType);

  const safeTitle = escapeHtml(title);
  const formattedBody = escapeHtml(body)
    .split('\n\n')
    .map((paragraph) => `<p style="margin: 0 0 16px; line-height: 1.6; color: #374151; font-size: 15px;">${paragraph.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
    <!-- Festive / Themed Header -->
    <tr>
      <td style="background: ${themeConfig.gradient}; padding: 32px 24px; text-align: center;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center">
              <!-- Theme Floating Emojis Banner -->
              <div style="font-size: 20px; letter-spacing: 6px; margin-bottom: 12px; opacity: 0.95;">
                ${themeConfig.bannerEmojis}
              </div>
              
              <!-- Gym Badge -->
              <div style="display: inline-block; padding: 6px 14px; background-color: rgba(255, 255, 255, 0.18); border-radius: 9999px; margin-bottom: 14px; backdrop-filter: blur(4px);">
                <span style="font-size: 13px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">
                  ${escapeHtml(gymName)}
                </span>
              </div>

              <!-- Main Themed Subject -->
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: ${themeConfig.headerColor}; line-height: 1.3;">
                ${themeConfig.emoji} ${safeTitle}
              </h1>

              <p style="margin: 0; font-size: 13px; color: ${themeConfig.subtextColor}; font-weight: 500;">
                ${escapeHtml(themeConfig.label)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Content Body -->
    <tr>
      <td style="padding: 28px 24px 20px;">
        <!-- Body Text -->
        <div style="color: #374151;">
          ${formattedBody}
        </div>

        <!-- Embedded Image Attachment (if applicable) -->
        ${attachmentUrl && isImage ? `
          <div style="margin: 24px 0 16px; text-align: center;">
            <img src="${escapeHtml(attachmentUrl)}" alt="Attachment" style="max-width: 100%; max-height: 480px; height: auto; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.06); object-fit: cover;" />
          </div>
        ` : ''}

        <!-- Document Attachment Card (if applicable) -->
        ${attachmentUrl && !isImage ? `
          <div style="margin: 20px 0 16px; padding: 14px 18px; border-radius: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; display: block;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td width="36" valign="middle">
                  <div style="font-size: 24px;">📄</div>
                </td>
                <td style="padding-left: 12px;" valign="middle">
                  <div style="font-size: 14px; font-weight: 600; color: #111827; word-break: break-all;">
                    ${escapeHtml(attachmentName || 'Attached Document')}
                  </div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                    Attachment document
                  </div>
                </td>
                <td align="right" valign="middle">
                  <a href="${escapeHtml(attachmentUrl)}" target="_blank" download style="display: inline-block; padding: 8px 16px; background-color: ${themeConfig.accent}; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 600;">
                    Download
                  </a>
                </td>
              </tr>
            </table>
          </div>
        ` : ''}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 20px 24px 24px; background-color: #fafafa; border-top: 1px solid #f3f4f6; text-align: center;">
        <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 6px;">
          ${gymLogoUrl ? `<img src="${escapeHtml(gymLogoUrl)}" alt="" width="20" height="20" style="border-radius: 4px; vertical-align: middle;" />` : ''}
          <span style="font-size: 13px; font-weight: 600; color: #4b5563;">${escapeHtml(gymName)}</span>
        </div>
        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
          Sent via GymOS &bull; Member notification &bull; ${themeConfig.emoji}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
