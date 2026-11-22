// Bloomguard — story. Original characters:
//   Wren  — a young gardener who has just inherited Grandma Ada's greenhouse.
//   Moss  — an ancient, gentle tortoise who carries a tiny garden on his shell.
//   The Rot Monarch and its five lieutenants, who stole the Hearthseed.
// Scenes play before a level ('pre') or after winning it ('post'), keyed by level index.

export const SPEAKERS = {
  wren: { name: 'Wren', color: '#ffb36b' },
  moss: { name: 'Moss', color: '#7fd08a' },
  grubmother: { name: 'Grubmother', color: '#c7a3d8', rotling: 'grubmother' },
  bogmaw: { name: 'Bogmaw', color: '#9fc79a', rotling: 'bogmaw' },
  cinderhusk: { name: 'Cinderhusk', color: '#ff9a6a', rotling: 'cinderhusk' },
  rimefang: { name: 'Rimefang', color: '#bfe2ff', rotling: 'rimefang' },
  gloomwyrm: { name: 'Gloomwyrm', color: '#a9b0ff', rotling: 'gloomwyrm' },
  monarch: { name: 'The Rot Monarch', color: '#ff8ad8', rotling: 'monarch' },
};

export const STORY = {
  'pre-0': [
    ['wren', 'Grandma Ada\'s greenhouse... it\'s even prettier than she said.'],
    ['moss', 'Ah. You must be Wren. I am Moss. I have kept this garden company for three hundred years.'],
    ['wren', 'A talking tortoise?! With a garden on his back?'],
    ['moss', 'Focus, little sprout. Do you feel that chill? Something has stolen the Hearthseed, the heart of every garden in the land.'],
    ['moss', 'Without it, the blight spreads. Rotlings are already crawling toward our lanterns. Plant guardians, and keep those lanterns lit!'],
  ],
  'post-0': [
    ['wren', 'They actually stopped! The guardians listened to me!'],
    ['moss', 'Guardians listen to gentle hands. Your grandmother had them too.'],
  ],
  'pre-3': [
    ['moss', 'Those little seedlings by the door are the last sprouts of the old Hearthseed.'],
    ['wren', 'Then nothing touches them. Not one leaf.'],
  ],
  'pre-5': [
    ['grubmother', 'Squelch... such a juicy greenhouse. My children are SO hungry.'],
    ['wren', 'Your children can eat dirt!'],
    ['moss', 'She is the Monarch\'s nursemaid. Beat her and we learn where the Hearthseed went.'],
  ],
  'post-5': [
    ['grubmother', 'Blegh... the Monarch... took the seed... to the Rotheart... you will never...'],
    ['moss', 'The Rotheart. Beyond the marsh, the orchard, the peaks and the caverns. A long road.'],
    ['wren', 'Then we\'d better start walking. Hop on my backpack, Moss. Wait, can you hop?'],
    ['moss', 'I can sit. Very well, in fact.'],
  ],
  'pre-6': [
    ['wren', 'It\'s so dark out here. No sun, no Glow...'],
    ['moss', 'At night the marsh fireflies carry the Glow. Catch them as they drift past. And try Sporelamps, they love the dark.'],
  ],
  'pre-11': [
    ['bogmaw', 'BLUUURRGH. Who walks in MY swamp?'],
    ['wren', 'Someone who\'s taking the Hearthseed back!'],
    ['bogmaw', 'Then sink with the rest of the mud!'],
  ],
  'post-11': [
    ['moss', 'Bogmaw sinks back into the bog. Look, a trail of ash to the east.'],
    ['wren', 'The orchard... it\'s burning!'],
  ],
  'pre-12': [
    ['moss', 'The Ember Orchard. The trees here once fed half the valley.'],
    ['wren', 'Watch out, sparks keep falling! I\'ll have to plant around them.'],
  ],
  'pre-17': [
    ['cinderhusk', 'Hah! Another little gardener to toast. Your guardians burn just like the trees.'],
    ['wren', 'Not with this many Barkwalls between us!'],
  ],
  'post-17': [
    ['cinderhusk', 'Fizzle... the cold... Rimefang waits... on the peaks...'],
    ['moss', 'Wrap your scarf tight, Wren. We climb.'],
  ],
  'pre-18': [
    ['wren', 'Brrr! Half the garden is frozen solid!'],
    ['moss', 'Tap the ice to break it. And mind the blizzards, they make even guardians sluggish.'],
  ],
  'pre-23': [
    ['rimefang', 'Everything stops, in the end. Seeds. Rivers. Little gardeners.'],
    ['wren', 'Spring always comes back. Every single year.'],
  ],
  'post-23': [
    ['moss', 'The ice is melting. Listen, water rushing down into the caverns.'],
    ['wren', 'And something glittering down there...'],
  ],
  'pre-24': [
    ['moss', 'The Crystal Caverns. No sun reaches here, but the crystals are full of Glow.'],
    ['wren', 'So I mine them for energy? I love it here already.'],
  ],
  'pre-29': [
    ['gloomwyrm', 'Ssso. The one who has been breaking my mistressss\'s servants.'],
    ['wren', 'Your mistress has something that doesn\'t belong to her.'],
    ['gloomwyrm', 'Catch me, then, if you can find me...'],
  ],
  'post-29': [
    ['moss', 'Beyond this tunnel lies the Rotheart. Wren... whatever happens, I am proud of you.'],
    ['wren', 'Don\'t get mushy on me now, Moss. We finish this together.'],
  ],
  'pre-30': [
    ['wren', 'The ground is... rotting. It\'s spreading across the tiles!'],
    ['moss', 'The blight hurts any guardian standing in it. Mossmenders can cleanse it. Plant them wisely.'],
  ],
  'pre-35': [
    ['monarch', 'So the old tortoise found a new pair of hands. How sweet.'],
    ['monarch', 'The Hearthseed is mine. When it rots, every garden rots with it, and the whole world becomes MY garden.'],
    ['wren', 'A garden needs someone who cares for it. You just want to own it.'],
    ['moss', 'Light every lantern, Wren. This is the last stand.'],
  ],
  'post-35': [
    ['monarch', 'No... the light... it burns...'],
    ['wren', 'The Hearthseed! It\'s warm, like holding a little sun.'],
    ['moss', 'Plant it back in Ada\'s greenhouse, and the land will heal. You did it, Wren.'],
    ['wren', 'WE did it. Now... how about Endless Bloom? I bet there are still a few Rotlings hiding out there.'],
  ],
};

export function scene(kind, level) {
  return STORY[`${kind}-${level}`] || null;
}
