// Free downloadable playbooks shown on the "Free Playbook" page (under Services).
//
// To add / "upload" a playbook: host the file publicly (Google Drive set to
// "Anyone with the link", Dropbox, S3, a raw PDF URL, …), then add an entry below with
// its download URL. For Google Drive, convert the share link to a direct download:
//   https://drive.google.com/file/d/FILE_ID/view  →  https://drive.google.com/uc?export=download&id=FILE_ID
// Leave `url` empty to list an entry as "Coming soon". `tag`, `format`, `size` are optional.
export const PLAYBOOKS = [
  {
    id: 'cold-email-outbound-setup',
    emoji: '📧',
    title: 'The Cold Email Outbound Playbook',
    desc: 'The complete cold-email system, end to end — ICP scoring, prospecting, AI-personalized copy, sending infrastructure & warmup (Google Workspace + Outlook), Instantly/Smartlead campaigns, deliverability fixes, and a 30-day launch plan.',
    tag: 'Outbound',
    format: 'PDF',
    size: '35 pages',
    updated: '2026-07-20',
    url: 'https://drive.google.com/uc?export=download&id=1Gv-5c6HT_0kAmcOkb-ZULj4sUObLFmYW',
  },
]
