/* Gary's specific instance of a reusable Western birthday template.
   These public-domain films are hosted with an official iframe embed by Internet Archive.
   External streaming and regional availability may change. */
export const garyPage = Object.freeze({
  template: 'western-birthday-v1',
  recipient: 'Gary',
  bubbleId: 'gary-westerns-2026',
  movies: Object.freeze([
    Object.freeze({
      provider: 'internet-archive',
      archiveId: 'BlueSteel',
      title: 'Blue Steel',
      year: 1934,
      publisher: 'Internet Archive · public-domain film',
      description: 'John Wayne plays an undercover marshal trying to expose a gang of ruthless outlaws.',
      sourceUrl: 'https://archive.org/details/BlueSteel'
    }),
    Object.freeze({
      provider: 'internet-archive',
      archiveId: 'The_Star_Packer',
      title: 'The Star Packer',
      year: 1934,
      publisher: 'Internet Archive · public-domain film',
      description: 'John Wayne rides into a threatened frontier town and faces the mysterious Shadow.',
      sourceUrl: 'https://archive.org/details/The_Star_Packer'
    })
  ])
});
