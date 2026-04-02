import avatar01 from "../assets/player_icons/adobe icons-01.png";
import avatar02 from "../assets/player_icons/adobe icons-02.png";
import avatar03 from "../assets/player_icons/adobe icons-03.png";
import avatar04 from "../assets/player_icons/adobe icons-04.png";
import avatar05 from "../assets/player_icons/adobe icons-05.png";
import avatar06 from "../assets/player_icons/adobe icons-06.png";
import avatar07 from "../assets/player_icons/adobe icons-07.png";
import avatar08 from "../assets/player_icons/adobe icons-08.png";
import avatar09 from "../assets/player_icons/adobe icons-09.png";
import avatar10 from "../assets/player_icons/adobe icons-10.png";
import avatar11 from "../assets/player_icons/adobe icons-11.png";
import avatar12 from "../assets/player_icons/adobe icons-12.png";

export const EMBEDDED_PLAYER_AVATAR_URLS = [
  avatar01,
  avatar02,
  avatar03,
  avatar04,
  avatar05,
  avatar06,
  avatar07,
  avatar08,
  avatar09,
  avatar10,
  avatar11,
  avatar12,
];

export function pickRandomPlayerAvatarUrl() {
  if (!EMBEDDED_PLAYER_AVATAR_URLS.length) return "";
  const i = Math.floor(Math.random() * EMBEDDED_PLAYER_AVATAR_URLS.length);
  return EMBEDDED_PLAYER_AVATAR_URLS[i];
}
