// รายการชื่อสถานที่แนะนำทั่ว สปป.ลาว สำหรับหน้านำเข้า /places/import (ให้ Google ค้นหาพิกัด/ที่อยู่ตอนนำเข้า — ไม่ได้เก็บพิกัดไว้ในโค้ด)
// เขียนเป็นอังกฤษ + เมือง/แขวง เพื่อให้ผลค้นหาแม่น แล้ว Google ส่งชื่อภาษาไทยกลับมา

export const RECOMMENDED_PLACES: { group: string; names: string[] }[] = [
  {
    group: 'นครหลวงเวียงจันทน์',
    names: [
      'Pha That Luang Vientiane', 'Patuxai Vientiane', 'Wat Si Saket Vientiane', 'Haw Phra Kaew Vientiane', 'Wat Si Muang Vientiane',
      'Buddha Park Xieng Khuan Vientiane', 'COPE Visitor Centre Vientiane', 'Talat Sao Morning Market Vientiane', 'Vientiane Night Market Mekong riverside',
      'That Dam Stupa Vientiane', 'Wattay International Airport Vientiane', 'Thanaleng Border Checkpoint Vientiane', 'Vientiane Railway Station',
    ],
  },
  {
    group: 'แขวงเวียงจันทน์ / วังเวียง',
    names: [
      'Tham Chang Cave Vang Vieng', 'Blue Lagoon 1 Vang Vieng', 'Blue Lagoon 3 Vang Vieng', 'Tham Phu Kham Vang Vieng', 'Pha Ngern Viewpoint Vang Vieng',
      'Nam Song River Vang Vieng', 'Muang Feuang Vientiane Province', 'Vang Vieng Railway Station', 'Nam Ngum Reservoir', 'Phou Khao Khouay National Park',
    ],
  },
  {
    group: 'แขวงหลวงพระบาง',
    names: [
      'Kuang Si Falls Luang Prabang', 'Mount Phousi Luang Prabang', 'Royal Palace Museum Luang Prabang', 'Wat Xieng Thong Luang Prabang',
      'Luang Prabang Night Market', 'Pak Ou Caves', 'Tad Sae Waterfall Luang Prabang', 'Ock Pop Tok Living Crafts Centre', 'Luang Prabang International Airport',
      'Luang Prabang Railway Station', 'Nong Khiaw Bridge', 'Pha Daeng Peak Nong Khiaw', 'Muang Ngoi Neua', 'Pakbeng',
    ],
  },
  {
    group: 'แขวงเชียงขวาง / หัวพัน',
    names: [
      'Plain of Jars Site 1 Phonsavan', 'Plain of Jars Site 2 Phonsavan', 'Plain of Jars Site 3 Phonsavan', 'Mines Advisory Group Visitor Centre Phonsavan',
      'Tham Piu Cave Xiengkhouang', 'Wat Phia Wat Muang Khoun', 'Viengxay Caves Houaphanh',
    ],
  },
  {
    group: 'แขวงทางเหนือ (หลวงน้ำทา / บ่อแก้ว / อุดมไซ / พงสาลี / ไซยะบุรี)',
    names: [
      'Luang Namtha Night Market', 'Muang Sing Luang Namtha', 'Nam Ha National Protected Area', 'Boten Border Checkpoint Laos China',
      'Huay Xai Friendship Bridge 4 Laos', 'Gibbon Experience Huay Xai', 'Muang Xay Oudomxay', 'Phongsaly old town',
      'Elephant Conservation Center Sayaboury',
    ],
  },
  {
    group: 'แขวงคำม่วน / สะหวันนะเขต',
    names: [
      'Konglor Cave Khammouane', 'Thakhek Mekong Riverfront', 'Buddha Cave Tham Pa Fa Thakhek', 'Savannakhet Dinosaur Museum', 'That Ing Hang Stupa Savannakhet',
      'Savannakhet Friendship Bridge 2',
    ],
  },
  {
    group: 'แขวงจำปาสัก / ภาคใต้',
    names: [
      'Wat Phou Champasak', 'Dao Heuang Market Pakse', 'Wat Phou Salao Pakse', 'Pakse International Airport', 'Khone Phapheng Falls', 'Li Phi Falls Don Khon',
      'Don Det Si Phan Don', 'Tad Fane Waterfall Bolaven Plateau', 'Tad Yuang Waterfall Bolaven Plateau', 'Tad Lo Waterfall Salavan', 'Paksong coffee plantation Bolaven',
    ],
  },
];

export const ALL_RECOMMENDED_NAMES = RECOMMENDED_PLACES.flatMap((g) => g.names);
