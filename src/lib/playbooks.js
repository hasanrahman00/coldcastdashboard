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
    title: 'Cold Email Outbound Setup',
    desc: 'Our end-to-end cold email + outbound setup — domains, mailboxes, warmup, sequences, and deliverability, the way we run it at Coldcast.',
    tag: 'Outbound',
    format: 'PDF',
    size: '',
    url: 'https://drive.google.com/uc?export=download&id=1Gv-5c6HT_0kAmcOkb-ZULj4sUObLFmYW',
  },
]
