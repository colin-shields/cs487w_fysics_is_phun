//add the images in here for host viewing and saving image on reload
export const EMBEDDED_PLAYER_AVATAR_URLS = [
  "https://i.redd.it/s1-thorfinn-was-looking-so-cool-v0-pos6jzra2lhf1.jpg?width=861&format=pjpg&auto=webp&s=41248ef69241b3c4da6274c7e5831934342feeb6",
  "https://www.illumination.com/wp-content/uploads/2019/11/Minions_Kevin2.png",
  "https://swordslice.com/cdn/shop/articles/Jujutsu-Kaisen-Season-2-Gojo-Satoru-fighting-Toji-MAPPA.webp?v=1736953868&width=1100",
];

export function pickRandomPlayerAvatarUrl() {
  if (!EMBEDDED_PLAYER_AVATAR_URLS.length) return "";
  const i = Math.floor(Math.random() * EMBEDDED_PLAYER_AVATAR_URLS.length);
  return EMBEDDED_PLAYER_AVATAR_URLS[i];
}
