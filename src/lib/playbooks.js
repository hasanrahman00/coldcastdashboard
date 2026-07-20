// Free downloadable playbooks shown on the "Free Playbook" page (under Services).
//
// To add / "upload" a playbook: host the file publicly (Google Drive set to
// "Anyone with the link", Dropbox, S3, a raw PDF URL, …), then add an entry below with
// its download URL. Leave `url` empty to list it as "Coming soon" until the file is
// ready. `tag`, `format`, and `size` are optional labels.
export const PLAYBOOKS = [
  {
    id: 'cold-email-101',
    title: 'Cold Email 101',
    desc: 'The exact framework we use to book meetings from cold — offer, sequence structure, and a deliverability checklist.',
    tag: 'Outbound',
    format: 'PDF',
    size: '',
    url: '',
  },
  {
    id: 'sales-nav-mastery',
    title: 'Sales Navigator Search Mastery',
    desc: 'Build laser-targeted Sales Nav searches that surface only your ICP — filters, boolean, and saved-search workflows.',
    tag: 'Prospecting',
    format: 'PDF',
    size: '',
    url: '',
  },
  {
    id: 'inbox-infrastructure',
    title: 'Cold Email Infrastructure Setup',
    desc: 'Domains, mailboxes, SPF / DKIM / DMARC, and warmup — the full setup so you land in the inbox, not spam.',
    tag: 'Deliverability',
    format: 'PDF',
    size: '',
    url: '',
  },
]
