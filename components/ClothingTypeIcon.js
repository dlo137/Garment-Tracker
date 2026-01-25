import { Image } from 'react-native';

// Static imports for all icons
import lightShirt from '../assets/clothing_icons/light-shirt.png';
import shirt from '../assets/clothing_icons/shirt.png';
import lightLongsleeve from '../assets/clothing_icons/light-longsleeve.png';
import longsleeve from '../assets/clothing_icons/longsleeve.png';
import lightSweater from '../assets/clothing_icons/light-sweater.png';
import sweater from '../assets/clothing_icons/sweater.png';
import lightHoodie from '../assets/clothing_icons/light-hoodie.png';
import hoodie from '../assets/clothing_icons/hoodie.png';
import lightPants from '../assets/clothing_icons/light-pants.png';
import pants from '../assets/clothing_icons/pants.png';
import lightShorts from '../assets/clothing_icons/light-shorts.png';
import shorts from '../assets/clothing_icons/shorts.png';
import lightDress from '../assets/clothing_icons/light-dress.png';
import dress from '../assets/clothing_icons/dress.png';
import lightSkirt from '../assets/clothing_icons/light-skirt.png';
import skirt from '../assets/clothing_icons/skirt.png';
import lightJacket from '../assets/clothing_icons/light-jacket.png';
import jacket from '../assets/clothing_icons/jacket.png';
import lightSuit from '../assets/clothing_icons/light-suit.png';
import suit from '../assets/clothing_icons/suit.png';
import lightActivewear from '../assets/clothing_icons/light-activewear.png';
import activewear from '../assets/clothing_icons/activewear.png';
import lightUnderwear from '../assets/clothing_icons/light-underwear.png';
import underwear from '../assets/clothing_icons/underwear.png';
import lightSocks from '../assets/clothing_icons/light-socks.png';
import socks from '../assets/clothing_icons/socks.png';
import lightAccessories from '../assets/clothing_icons/light-accessories.png';
import accessories from '../assets/clothing_icons/accessories.png';

const typeToIcon = {
  't-shirts': 'shirt',
  't-shirt': 'shirt',
  'long sleeves': 'longsleeve',
  'long sleeve': 'longsleeve',
  'shirts': 'shirt',
  'shirt': 'shirt',
  'crew necks': 'sweater',
  'crew neck': 'sweater',
  'hoodies': 'hoodie',
  'hoodie': 'hoodie',
  'pants': 'pants',
  'shorts': 'shorts',
  'dresses': 'dress',
  'dress': 'dress',
  'skirts': 'skirt',
  'skirt': 'skirt',
  'jackets': 'jacket',
  'jacket': 'jacket',
  'sweaters': 'sweater',
  'sweater': 'sweater',
  'suits': 'suit',
  'suit': 'suit',
  'activewear': 'activewear',
  'underwear': 'underwear',
  'socks': 'socks',
  'accessories': 'accessories',
  'other': 'shirt',
};

const iconAssets = {
  shirt: { light: shirt, dark: lightShirt },
  longsleeve: { light: longsleeve, dark: lightLongsleeve },
  sweater: { light: sweater, dark: lightSweater },
  hoodie: { light: hoodie, dark: lightHoodie },
  pants: { light: pants, dark: lightPants },
  shorts: { light: shorts, dark: lightShorts },
  dress: { light: dress, dark: lightDress },
  skirt: { light: skirt, dark: lightSkirt },
  jacket: { light: jacket, dark: lightJacket },
  suit: { light: suit, dark: lightSuit },
  activewear: { light: activewear, dark: lightActivewear },
  underwear: { light: underwear, dark: lightUnderwear },
  socks: { light: socks, dark: lightSocks },
  accessories: { light: accessories, dark: lightAccessories },
};

export const ClothingTypeIcon = ({ type, theme = 'light', size = 32 }) => {
  const key = (type || '').toLowerCase();
  const iconKey = typeToIcon[key] || 'shirt';
  const iconSet = iconAssets[iconKey] || iconAssets['shirt'];
  // Use 'light' icons for light mode, regular for dark mode
  const iconPath = theme === 'light' ? iconSet.light : iconSet.dark;
  console.log('[ClothingTypeIcon]', { type, theme, iconPath });
  return (
    <Image source={iconPath} style={{ width: size, height: size, resizeMode: 'contain' }} />
  );
};
