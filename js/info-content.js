const nmw = { text: 'NMW', href: 'https://www.nmwstudio.net/' };
const flexiblePictures = { text: 'Flexible Pictures', href: 'https://www.instagram.com/flexiblepictures_/' };
const watchaPedia = { text: 'WATCHA PEDIA', href: 'https://pedia.watcha.com/ko/users/7gdxdWog25GYJ' };

export const introduction = [
  ['서울에서 활동하는 영상 제작자이다.'],
  ['기획, 연출, 편집을 하며 현재는 프리랜서로 일하고 있다.'],
  [
    '이전에 패션·뷰티 영상 프로덕션 ',
    nmw,
    ' 그리고 뮤직비디오 프로덕션 ',
    flexiblePictures,
    '에서 일했다.',
  ],
  ['AI를 활용한 창작과 제작 방식을 탐구하고 있으며, 작업 과정과 결과는 이곳에 기록하려 한다.'],
  [
    '취미는 영화 감상이다. 본 영화들을 ',
    { ...watchaPedia, text: '왓챠피디아' },
    '에 기록하고 있다.',
  ],
  ['음악과 이미지가 딱 맞아떨어지며 공명하는 순간을 좋아한다.'],
];

export const englishIntroduction = [
  ['A Seoul-based filmmaker working in concept development, directing, and editing. Currently working as a freelancer.'],
  [
    'Previously worked at fashion and beauty film production studio ',
    nmw,
    ' and music video production company ',
    flexiblePictures,
    '.',
  ],
  ['Currently exploring AI-assisted creative and production processes, with plans to document both the process and outcomes here.'],
  ['Enjoys watching films and keeps a record of them on ', watchaPedia, '.'],
  ['Likes moments when music and imagery perfectly align and resonate.'],
];

const email = 'jungyejin@kakao.com';
export const contact = [
  ['instagram ', { text: '@422hq', href: 'https://www.instagram.com/422hq/' }],
  ['email ', { text: email, href: `mailto:${email}` }],
];
